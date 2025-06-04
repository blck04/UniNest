
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Property, Review, AIPropertySuggestion, PropertyFormData, Enrollment, StudentEnrollmentFormData, User, BookingInterest, BookingInterestFormData, StudentRentalInfo, EnrollFromInterestFormData } from './types';
import { format, parseISO, isBefore, isEqual } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

const toTimestamp = (date: Date | undefined | null): Timestamp | undefined => {
  if (!date) return undefined;
  if (date instanceof Date && !isNaN(date.valueOf())) {
    return Timestamp.fromDate(date);
  }
  return undefined;
};

const fromTimestamp = (timestamp: Timestamp | undefined | null): Date | undefined => {
  if (!timestamp) return undefined;
  return timestamp.toDate();
};

export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided for upload.");
  const fileId = uuidv4();
  const fileExtension = file.name.split('.').pop() || 'bin'; // Default extension if none
  const fileNameWithExtension = `${fileId}.${fileExtension}`;
  const fullPath = `${path}/${fileNameWithExtension}`; 
  
  const storageRef = ref(storage, fullPath.includes('.') ? path : fullPath);
  
  try {
    console.log(`Attempting to upload ${file.name} to ${storageRef.fullPath}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`Successfully uploaded ${file.name}, URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading file to ${storageRef.fullPath}:`, error);
    throw new Error(`Failed to upload file: ${file.name}. Original error: ${(error as Error).message}`);
  }
};


const propertiesCollection = collection(db, "properties");

const fromFirestorePropertyDoc = (docSnap: import('firebase/firestore').DocumentSnapshot): Property => {
  const data = docSnap.data()!; 
  return {
    id: docSnap.id,
    name: data.name,
    address: data.address,
    city: data.city,
    suburb: data.suburb,
    description: data.description,
    type: data.type,
    capacity: Number(data.capacity),
    genderPreference: data.genderPreference,
    amenities: data.amenities || [],
    price: Number(data.price),
    landlordId: data.landlordId,
    landlordName: data.landlordName,
    landlordEmail: data.landlordEmail,
    landlordPhoneNumber: data.landlordPhoneNumber,
    availability: (data.availability || []).map((a: any) => ({
      from: fromTimestamp(a.from as Timestamp) || new Date(), 
      to: fromTimestamp(a.to as Timestamp),
    })),
    images: data.images || [{ url: 'https://placehold.co/600x400.png', hint: 'property exterior' }],
    averageRating: data.averageRating || 0,
    viewCount: data.viewCount || 0,
    interestedCount: data.interestedCount || 0,
    createdAt: fromTimestamp(data.createdAt as Timestamp),
    updatedAt: fromTimestamp(data.updatedAt as Timestamp),
    enrolledStudentsCount: data.enrolledStudentsCount || 0,
  } as Property;
};


export const addProperty = async (propertyData: PropertyFormData, landlord: User): Promise<Property | undefined> => {
  if (!landlord || !landlord.uid || !landlord.name || !landlord.email || !landlord.phoneNumber) {
    console.error("Landlord details (ID, Name, Email, Phone) are missing for addProperty");
    throw new Error("Complete landlord information is missing to create a property.");
  }

  const tempPropertyId = uuidv4(); 
  console.log("PropertyData received in addProperty:", propertyData);

  let validImages: { url: string; hint: string }[] = [];
  try {
    const uploadedImageUrls = await Promise.all(
      (propertyData.images || []).map(async (imgInput) => {
        if (imgInput.file && imgInput.file[0]) {
          try {
            const url = await uploadFileToStorage(imgInput.file[0], `propertyImages/${landlord.uid}/${tempPropertyId}`);
            return { url, hint: imgInput.hint };
          } catch (uploadError) {
            console.error(`Failed to upload an image: ${imgInput.file[0].name}`, uploadError);
            return null; 
          }
        }
        return null; 
      })
    );
    validImages = uploadedImageUrls.filter(img => img !== null) as { url: string; hint: string }[];
    console.log("Processed image URLs:", validImages);
  } catch (error) {
      console.error("Error during image upload Promise.all:", error);
      throw new Error("An error occurred during image processing.");
  }


  const availabilityParsed = propertyData.availability.map(a => {
    const fromDate = parseISO(a.from);
    if (isNaN(fromDate.valueOf())) {
      console.error(`Invalid 'from' date format for availability: ${a.from}. Expected YYYY-MM-DD.`);
      throw new Error(`Invalid 'from' date format: ${a.from}. Please use YYYY-MM-DD.`);
    }
    const fromTs = toTimestamp(fromDate);

    let toTs = null; 
    if (a.to && a.to.trim() !== '') {
      const toDate = parseISO(a.to);
      if (isNaN(toDate.valueOf())) {
        console.error(`Invalid 'to' date format for availability: ${a.to}. Expected YYYY-MM-DD.`);
        throw new Error(`Invalid 'to' date format: ${a.to}. Please use YYYY-MM-DD.`);
      }
      if (isBefore(toDate, fromDate) && !isEqual(toDate, fromDate)) {
         console.error(`Availability 'to' date (${a.to}) cannot be before 'from' date (${a.from}).`);
         throw new Error(`Availability 'to' date (${a.to}) cannot be before 'from' date (${a.from}).`);
      }
      toTs = toTimestamp(toDate);
    }
    return { from: fromTs, to: toTs };
  });

  const newPropertyDataForFirestore = {
    name: propertyData.name,
    address: propertyData.address,
    city: propertyData.city,
    suburb: propertyData.suburb,
    description: propertyData.description,
    type: propertyData.type,
    capacity: Number(propertyData.capacity),
    genderPreference: propertyData.genderPreference,
    amenities: propertyData.amenities || [],
    price: Number(propertyData.price),
    landlordId: landlord.uid,
    landlordName: landlord.name,
    landlordEmail: landlord.email, 
    landlordPhoneNumber: landlord.phoneNumber, 
    availability: availabilityParsed,
    images: validImages.length > 0 ? validImages : [{ url: 'https://placehold.co/600x400.png', hint: 'property exterior default' }],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    viewCount: 0,
    interestedCount: 0,
    averageRating: 0,
    enrolledStudentsCount: 0,
  };
  
  console.log("Data to be written to Firestore properties collection:", JSON.stringify(newPropertyDataForFirestore, null, 2));

  try {
    const docRef = await addDoc(propertiesCollection, newPropertyDataForFirestore);
    console.log("Property document successfully written with ID:", docRef.id);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      return fromFirestorePropertyDoc(newDocSnap);
    }
    console.warn("Newly added property document not found immediately after creation for ID:", docRef.id);
    return undefined; 
  } catch (error: any) {
    console.error("Firestore Error: Failed to add property document: ", error);
    if (error.code) {
        console.error("Firestore error code:", error.code);
        console.error("Firestore error message:", error.message);
    }
    throw new Error(`Failed to add property to database. Original error: ${error.message || String(error)}`);
  }
};

export const updateProperty = async (propertyId: string, propertyData: PropertyFormData, landlord: User): Promise<Property | undefined> => {
  const propertyRef = doc(db, "properties", propertyId);
  console.log("PropertyData received in updateProperty:", propertyData);
  try {
    const currentPropertySnap = await getDoc(propertyRef);
    if (!currentPropertySnap.exists() || currentPropertySnap.data().landlordId !== landlord.uid) {
      console.error("Property not found or landlord mismatch for update.");
      throw new Error("Property not found or you do not have permission to edit this property.");
    }
    if (!landlord.email || !landlord.phoneNumber) {
        throw new Error("Landlord contact information is missing for property update.");
    }

    let finalImages = currentPropertySnap.data().images; 

    if (propertyData.images && propertyData.images.length > 0 && propertyData.images.some(img => img.file && img.file.length > 0)) {
      console.log("New images provided, attempting to upload and replace existing ones.");
      const uploadedImageUrls = await Promise.all(
        propertyData.images.map(async (imgInput) => {
          if (imgInput.file && imgInput.file[0]) {
            try {
              const url = await uploadFileToStorage(imgInput.file[0], `propertyImages/${landlord.uid}/${propertyId}`);
              return { url, hint: imgInput.hint };
            } catch (uploadError) {
              console.error(`Failed to upload an image during update: ${imgInput.file[0].name}`, uploadError);
              return null;
            }
          }
          return null;
        })
      );
      const newValidImages = uploadedImageUrls.filter(img => img !== null) as { url: string; hint: string }[];
      if (newValidImages.length > 0) {
        finalImages = newValidImages;
      } else if (propertyData.images.some(img => img.file && img.file.length > 0)) {
        console.warn("New images were provided for update, but all uploads failed. Keeping existing images.");
      }
      console.log("Processed image URLs for update:", finalImages);
    } else {
      console.log("No new images provided for update, keeping existing images.");
    }
    
    const availabilityParsed = propertyData.availability.map(a => {
        const fromDate = parseISO(a.from);
        if (isNaN(fromDate.valueOf())) {
          console.error(`Invalid 'from' date format for availability: ${a.from}. Expected YYYY-MM-DD.`);
          throw new Error(`Invalid 'from' date format: ${a.from}. Please use YYYY-MM-DD.`);
        }
        const fromTs = toTimestamp(fromDate);

        let toTs = null; 
        if (a.to && a.to.trim() !== '') {
          const toDate = parseISO(a.to);
          if (isNaN(toDate.valueOf())) {
            console.error(`Invalid 'to' date format for availability: ${a.to}. Expected YYYY-MM-DD.`);
            throw new Error(`Invalid 'to' date format: ${a.to}. Please use YYYY-MM-DD.`);
          }
           if (isBefore(toDate, fromDate) && !isEqual(toDate, fromDate)) {
             console.error(`Availability 'to' date (${a.to}) cannot be before 'from' date (${a.from}).`);
             throw new Error(`Availability 'to' date (${a.to}) cannot be before 'from' date (${a.from}).`);
          }
          toTs = toTimestamp(toDate);
        }
        return { from: fromTs, to: toTs };
    });

    const updateData = {
        name: propertyData.name,
        address: propertyData.address,
        city: propertyData.city,
        suburb: propertyData.suburb,
        description: propertyData.description,
        type: propertyData.type,
        genderPreference: propertyData.genderPreference,
        amenities: propertyData.amenities || [],
        capacity: Number(propertyData.capacity),
        price: Number(propertyData.price),
        landlordName: landlord.name, 
        landlordEmail: landlord.email, 
        landlordPhoneNumber: landlord.phoneNumber, 
        availability: availabilityParsed,
        images: finalImages, 
        updatedAt: Timestamp.now(),
    };
    console.log("Data to be written to Firestore for property update:", JSON.stringify(updateData, null, 2));

    await updateDoc(propertyRef, updateData);
    console.log("Property document successfully updated for ID:", propertyId);
    const updatedDocSnap = await getDoc(propertyRef);
    if (updatedDocSnap.exists()) {
      return fromFirestorePropertyDoc(updatedDocSnap);
    }
    return undefined;
  } catch (error: any) {
    console.error("Firestore Error: Failed to update property document: ", error);
     if (error.code) {
        console.error("Firestore error code:", error.code);
        console.error("Firestore error message:", error.message);
    }
    throw new Error(`Failed to update property in database. Original error: ${error.message || String(error)}`);
  }
};

export const deleteProperty = async (propertyId: string, currentLandlordId: string): Promise<boolean> => {
  const propertyRef = doc(db, "properties", propertyId);
  try {
    const currentPropertySnap = await getDoc(propertyRef);
    if (!currentPropertySnap.exists() || currentPropertySnap.data().landlordId !== currentLandlordId) {
      console.error("Property not found or landlord mismatch for delete.");
      throw new Error("Property not found or you do not have permission to delete this property.");
    }
    await deleteDoc(propertyRef);
    return true;
  } catch (error: any) {
    console.error("Error deleting property from Firestore: ", error);
    throw new Error(error.message || "Failed to delete property from database.");
  }
};


export const getPropertyById = async (id: string): Promise<Property | null> => {
  if (!id) return null;
  const propertyDocRef = doc(db, "properties", id);
  try {
    const docSnap = await getDoc(propertyDocRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      if (currentData) { 
          await updateDoc(propertyDocRef, {
              viewCount: (currentData.viewCount || 0) + 1,
              updatedAt: Timestamp.now()
          });
      }
      const updatedSnap = await getDoc(propertyDocRef); 
      return fromFirestorePropertyDoc(updatedSnap);
    } else {
      console.log("No such property document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching property by ID:", error);
    return null;
  }
};

export const getPropertyByIdSkipViewCount = async (id: string): Promise<Property | null> => {
  if (!id) return null;
  const propertyDocRef = doc(db, "properties", id);
  try {
    const docSnap = await getDoc(propertyDocRef);
    if (docSnap.exists()) {
      return fromFirestorePropertyDoc(docSnap);
    } else {
      console.log("No such property document for skip view count!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching property by ID (skip view count):", error);
    return null;
  }
};


export const getAllProperties = async (filters?: any): Promise<Property[]> => {
  let q = query(propertiesCollection, orderBy("createdAt", "desc"));
  if (filters) {
    // Filtering logic would go here
  }

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => fromFirestorePropertyDoc(docSnap));
  } catch (error) {
    console.error("Error fetching all properties:", error);
    return [];
  }
};

export const fetchLandlordPropertiesForDashboard = async (landlordId: string): Promise<Property[]> => {
  if (!landlordId) return [];
  const q = query(propertiesCollection, where("landlordId", "==", landlordId), orderBy("createdAt", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => fromFirestorePropertyDoc(docSnap));
  } catch (error) {
    console.error("Error fetching landlord properties:", error);
    return [];
  }
};


const reviewsCollection = collection(db, "reviews");

const fromFirestoreReviewData = (data: any): Omit<Review, 'id'> => {
  return {
    ...data,
    date: fromTimestamp(data.date as Timestamp) || new Date(),
  } as Omit<Review, 'id'>;
};

export const addReview = async (reviewInput: Omit<Review, 'id' | 'date'>): Promise<Review> => {
  if (!reviewInput.studentId || !reviewInput.propertyId) {
    console.error("studentId or propertyId missing in reviewInput", reviewInput);
    throw new Error("Student ID and Property ID are required to post a review.");
  }

  const existingReviewQuery = query(
    reviewsCollection,
    where("propertyId", "==", reviewInput.propertyId),
    where("studentId", "==", reviewInput.studentId)
  );

  try {
    const existingReviewsSnap = await getDocs(existingReviewQuery);
    if (!existingReviewsSnap.empty) {
      throw new Error("You have already reviewed this property.");
    }

    const reviewDataForFirestore = {
      ...reviewInput,
      date: Timestamp.now(),
    };

    const docRef = await addDoc(reviewsCollection, reviewDataForFirestore);
    const allReviewsForProperty = await getReviewsForProperty(reviewInput.propertyId);
    const totalRating = allReviewsForProperty.reduce((sum, r) => sum + r.rating, 0);
    const newAverageRating = allReviewsForProperty.length > 0 ? parseFloat((totalRating / allReviewsForProperty.length).toFixed(1)) : 0;

    const propertyRef = doc(db, "properties", reviewInput.propertyId);
    await updateDoc(propertyRef, { averageRating: newAverageRating, updatedAt: Timestamp.now() });

    const newReviewDoc = await getDoc(docRef);
    if (newReviewDoc.exists()) {
        return { id: newReviewDoc.id, ...fromFirestoreReviewData(newReviewDoc.data()) } as Review;
    } else {
        throw new Error("Failed to retrieve the newly added review.");
    }

  } catch (error: any) {
    console.error("Error adding review to Firestore: ", error.message);
    throw new Error(error.message || "Failed to add review to database.");
  }
};

export const getReviewsForProperty = async (propertyId: string): Promise<Review[]> => {
  if (!propertyId) return [];
  const q = query(reviewsCollection, where("propertyId", "==", propertyId), orderBy("date", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...fromFirestoreReviewData(doc.data())
    } as Review));
  } catch (error) {
    console.error("Error fetching reviews for property:", error);
    return [];
  }
};

const bookingInterestsCollection = collection(db, "bookingInterests");

const fromFirestoreBookingInterest = (docSnap: import('firebase/firestore').DocumentSnapshot): BookingInterest => {
  const data = docSnap.data()!;
  return {
    id: docSnap.id,
    propertyId: data.propertyId,
    propertyName: data.propertyName,
    studentId: data.studentId,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    nationalId: data.nationalId,
    studentAppId: data.studentAppId,
    checkInDate: fromTimestamp(data.checkInDate as Timestamp) || new Date(),
    checkOutDate: fromTimestamp(data.checkOutDate as Timestamp) || new Date(),
    nationalIdPhotoUrl: data.nationalIdPhotoUrl, // These are from the student's profile
    studentIdPhotoUrl: data.studentIdPhotoUrl,   // These are from the student's profile
    message: data.message,
    status: data.status,
    submittedAt: fromTimestamp(data.submittedAt as Timestamp) || new Date(),
  } as BookingInterest;
}

export const addBookingInterest = async (formData: BookingInterestFormData & { studentId: string }): Promise<string> => {
  try {
    // Fetch student's user document to get ID photo URLs
    const studentUserDocRef = doc(db, "users", formData.studentId);
    const studentUserSnap = await getDoc(studentUserDocRef);
    let studentNationalIdPhotoUrl, studentIdPhotoUrlFromProfile;

    if (studentUserSnap.exists()) {
        const studentData = studentUserSnap.data();
        studentNationalIdPhotoUrl = studentData.nationalIdPhotoUrl;
        studentIdPhotoUrlFromProfile = studentData.studentIdPhotoUrl;
    }


    const interestData: Omit<BookingInterest, 'id' | 'submittedAt' | 'status'> = { 
      propertyId: formData.propertyId,
      propertyName: formData.propertyName,
      studentId: formData.studentId,
      studentName: formData.studentName,
      studentEmail: formData.studentEmail,
      nationalId: formData.nationalId, // National ID string from form
      studentAppId: formData.studentAppId, // Student ID string from form
      checkInDate: parseISO(formData.checkInDate),
      checkOutDate: parseISO(formData.checkOutDate),
      nationalIdPhotoUrl: studentNationalIdPhotoUrl, // URL from student's profile
      studentIdPhotoUrl: studentIdPhotoUrlFromProfile, // URL from student's profile
      message: formData.message || "",
    };

    const fullInterestData: Omit<BookingInterest, 'id'> = {
      ...(interestData as Omit<BookingInterest, 'id' | 'submittedAt' | 'status'>), 
      status: 'pending',
      submittedAt: Timestamp.now(),
    };

    const docRef = await addDoc(bookingInterestsCollection, fullInterestData);
    const propertyRef = doc(db, "properties", formData.propertyId);
    const propertySnap = await getDoc(propertyRef);
    if (propertySnap.exists()) {
        const currentData = propertySnap.data();
        if (currentData) { 
            await updateDoc(propertyRef, {
                interestedCount: (currentData.interestedCount || 0) + 1,
                updatedAt: Timestamp.now()
            });
        }
    }
    return docRef.id;
  } catch (error) {
    console.error("Error adding booking interest to Firestore:", error);
    throw new Error("Failed to submit booking interest.");
  }
};

export const getBookingInterestsForProperty = async (propertyId: string, statusFilter?: BookingInterest['status'][]): Promise<BookingInterest[]> => {
  if (!propertyId) return [];
  let q = query(bookingInterestsCollection, where("propertyId", "==", propertyId), orderBy("submittedAt", "desc"));
  if (statusFilter && statusFilter.length > 0) {
      q = query(q, where("status", "in", statusFilter));
  }

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => fromFirestoreBookingInterest(docSnap));
  } catch (error) {
    console.error("Error fetching booking interests for property:", error);
    return [];
  }
};

export const updateBookingInterestStatus = async (interestId: string, newStatus: BookingInterest['status']): Promise<boolean> => {
  const interestRef = doc(db, "bookingInterests", interestId);
  try {
    await updateDoc(interestRef, { status: newStatus, updatedAt: Timestamp.now() });
    return true;
  } catch (error) {
    console.error("Error updating booking interest status:", error);
    return false;
  }
};


const enrollmentsCollection = collection(db, "enrollments");

const fromFirestoreEnrollmentData = (data: any): Omit<Enrollment, 'id'> => {
    return {
      ...data,
      checkInDate: fromTimestamp(data.checkInDate as Timestamp) || new Date(),
      rentDueDate: fromTimestamp(data.rentDueDate as Timestamp) || new Date(),
      checkOutDate: fromTimestamp(data.checkOutDate as Timestamp) || new Date(),
      actualCheckoutDate: fromTimestamp(data.actualCheckoutDate as Timestamp),
    } as Omit<Enrollment, 'id'>;
};

export const addEnrolledStudentToProperty = async ( 
  propertyId: string,
  landlordId: string,
  studentData: StudentEnrollmentFormData, 
  studentId: string, 
  propertyName: string
): Promise<Enrollment | undefined> => {
    const propertySnap = await getDoc(doc(db, "properties", propertyId));
    if (!propertySnap.exists() || propertySnap.data().landlordId !== landlordId) {
        throw new Error("Property not found or landlord mismatch for enrollment.");
    }

    const newEnrollmentData: Omit<Enrollment, 'id'> = {
        propertyId: propertyId,
        propertyName: propertyName, 
        studentId: studentId, 
        studentName: studentData.name,
        landlordId: landlordId,
        checkInDate: parseISO(studentData.checkInDate),
        rentDueDate: parseISO(studentData.rentDueDate),
        checkOutDate: parseISO(studentData.checkOutDate),
        isActive: true,
    };

    try {
        const docRef = await addDoc(enrollmentsCollection, newEnrollmentData);
        const propertyData = propertySnap.data();
        if (propertyData) { 
            await updateDoc(doc(db, "properties", propertyId), {
                enrolledStudentsCount: (propertyData.enrolledStudentsCount || 0) + 1,
                updatedAt: Timestamp.now()
            });
        }
        const newDocSnap = await getDoc(docRef);
        if (newDocSnap.exists()) {
            return { id: newDocSnap.id, ...fromFirestoreEnrollmentData(newDocSnap.data()) } as Enrollment;
        }
        return undefined;
    } catch (error) {
        console.error("Error adding enrollment to Firestore:", error);
        throw new Error("Failed to enroll student.");
    }
};

export const enrollStudentFromBookingInterest = async (
  interest: BookingInterest,
  enrollmentDetails: EnrollFromInterestFormData,
  landlordId: string
): Promise<Enrollment | undefined> => {
  const propertySnap = await getDoc(doc(db, "properties", interest.propertyId));
  if (!propertySnap.exists() || propertySnap.data()?.landlordId !== landlordId) {
    throw new Error("Property not found or landlord mismatch for enrollment from interest.");
  }

  const newEnrollmentData: Omit<Enrollment, 'id'> = {
    propertyId: interest.propertyId,
    propertyName: interest.propertyName,
    studentId: interest.studentId,
    studentName: interest.studentName,
    landlordId: landlordId,
    checkInDate: parseISO(enrollmentDetails.checkInDate),
    rentDueDate: parseISO(enrollmentDetails.rentDueDate),
    checkOutDate: parseISO(enrollmentDetails.checkOutDate),
    isActive: true,
  };

  const batch = writeBatch(db);

  try {
    const enrollmentDocRef = doc(collection(db, "enrollments")); 
    batch.set(enrollmentDocRef, newEnrollmentData);

    const interestDocRef = doc(db, "bookingInterests", interest.id);
    batch.update(interestDocRef, { status: 'accepted', updatedAt: Timestamp.now() });
    
    const propertyDocRef = doc(db, "properties", interest.propertyId);
    const currentPropertyData = propertySnap.data();
    if(currentPropertyData) {
        batch.update(propertyDocRef, {
            enrolledStudentsCount: (currentPropertyData.enrolledStudentsCount || 0) + 1,
            interestedCount: Math.max(0, (currentPropertyData.interestedCount || 0) - 1),
            updatedAt: Timestamp.now()
        });
    }
    
    await batch.commit();

    const newEnrollmentSnap = await getDoc(enrollmentDocRef);
    if (newEnrollmentSnap.exists()){
      return { id: newEnrollmentSnap.id, ...fromFirestoreEnrollmentData(newEnrollmentSnap.data()) } as Enrollment;
    }
    return undefined;

  } catch (error) {
    console.error("Error enrolling student from booking interest:", error);
    throw new Error("Failed to process enrollment from interest.");
  }
};


export const editEnrolledStudentInProperty = async (enrollmentId: string, propertyId: string, landlordId: string, studentData: StudentEnrollmentFormData): Promise<Enrollment | undefined> => {
    const enrollmentRef = doc(db, "enrollments", enrollmentId);
    const enrollmentSnap = await getDoc(enrollmentRef);
    const currentEnrollmentData = enrollmentSnap.data();

    if (!enrollmentSnap.exists() || !currentEnrollmentData || currentEnrollmentData.landlordId !== landlordId || currentEnrollmentData.propertyId !== propertyId) {
        throw new Error("Enrollment not found or permission denied.");
    }

    const updatedEnrollmentData = {
        studentName: studentData.name,
        checkInDate: parseISO(studentData.checkInDate),
        rentDueDate: parseISO(studentData.rentDueDate),
        checkOutDate: parseISO(studentData.checkOutDate),
    };

    try {
        await updateDoc(enrollmentRef, updatedEnrollmentData);
        const updatedSnap = await getDoc(enrollmentRef);
        if (updatedSnap.exists()) {
             return { id: updatedSnap.id, ...fromFirestoreEnrollmentData(updatedSnap.data()) } as Enrollment;
        }
       return undefined;
    } catch (error) {
        console.error("Error updating enrollment in Firestore:", error);
        throw new Error("Failed to update enrollment.");
    }
};

export const removeEnrolledStudentFromProperty = async (enrollmentId: string, propertyId: string, landlordId: string): Promise<boolean> => {
    const enrollmentRef = doc(db, "enrollments", enrollmentId);
    const enrollmentSnap = await getDoc(enrollmentRef);
    const currentEnrollmentData = enrollmentSnap.data();

    if (!enrollmentSnap.exists() || !currentEnrollmentData || currentEnrollmentData.landlordId !== landlordId || currentEnrollmentData.propertyId !== propertyId) {
        throw new Error("Enrollment not found or permission denied for removal.");
    }

    const batch = writeBatch(db);
    try {
        batch.delete(enrollmentRef);

        const propertyRef = doc(db, "properties", propertyId);
        const propertySnap = await getDoc(propertyRef);
        const currentPropertyData = propertySnap.data();
        if (propertySnap.exists() && currentPropertyData) {
            batch.update(propertyRef, {
                enrolledStudentsCount: Math.max(0, (currentPropertyData.enrolledStudentsCount || 0) - 1),
                updatedAt: Timestamp.now()
            });
        }
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting enrollment from Firestore:", error);
        throw new Error("Failed to remove student enrollment.");
    }
};

export const getEnrollmentsForProperty = async (propertyId: string): Promise<Enrollment[]> => {
    const q = query(enrollmentsCollection, where("propertyId", "==", propertyId), where("isActive", "==", true), orderBy("checkInDate", "desc"));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...fromFirestoreEnrollmentData(docSnap.data())
        } as Enrollment));
    } catch (error) {
        console.error("Error fetching enrollments for property:", error);
        return [];
    }
};

export const getStudentRentalDetails = async (studentUserId: string): Promise<StudentRentalInfo | null> => {
  const q = query(
    enrollmentsCollection,
    where("studentId", "==", studentUserId),
    where("isActive", "==", true),
    orderBy("checkOutDate", "desc"),
    limit(1)
  );

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const enrollmentDoc = querySnapshot.docs[0];
      const enrollment = { id: enrollmentDoc.id, ...fromFirestoreEnrollmentData(enrollmentDoc.data()) } as Enrollment;
      
      const property = await getPropertyByIdSkipViewCount(enrollment.propertyId);

      if (property) {
        return { property, enrollment };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching student rental details:", error);
    return null;
  }
};

export const checkOutStudentFromProperty = async (studentUserId: string, enrollmentId: string): Promise<boolean> => {
  const enrollmentRef = doc(db, "enrollments", enrollmentId);
  const batch = writeBatch(db);
  try {
    const enrollmentSnap = await getDoc(enrollmentRef);
    const currentEnrollmentData = enrollmentSnap.data();

    if (!enrollmentSnap.exists() || !currentEnrollmentData || currentEnrollmentData.studentId !== studentUserId) {
      throw new Error("Enrollment not found or student ID mismatch.");
    }
    batch.update(enrollmentRef, {
      isActive: false,
      actualCheckoutDate: Timestamp.now()
    });

    const propertyRef = doc(db, "properties", currentEnrollmentData.propertyId);
    const propertySnap = await getDoc(propertyRef);
    const currentPropertyData = propertySnap.data();
    if (propertySnap.exists() && currentPropertyData) {
        batch.update(propertyRef, {
            enrolledStudentsCount: Math.max(0, (currentPropertyData.enrolledStudentsCount || 0) - 1),
            updatedAt: Timestamp.now()
        });
    }
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error checking out student:", error);
    return false;
  }
};

export const formatDateForDisplay = (dateInput: string | Date | undefined | Timestamp): string => {
    if (!dateInput) return 'N/A';
    try {
      let dateToFormat: Date;
      if (dateInput instanceof Timestamp) {
        dateToFormat = dateInput.toDate();
      } else if (typeof dateInput === 'string') {
        const parsed = parseISO(dateInput);
        if (!isNaN(parsed.valueOf())) { 
          dateToFormat = parsed;
        } else {
          dateToFormat = new Date(dateInput);
        }
      } else if (dateInput instanceof Date) {
        dateToFormat = dateInput;
      } else {
        return 'Invalid Date Input';
      }

      if (isNaN(dateToFormat.valueOf())) return 'Invalid Date'; 

      return format(dateToFormat, "MMM dd, yyyy");
    } catch (e) {
      console.warn("Date formatting error for input:", dateInput, e);
      return typeof dateInput.toString === 'function' ? dateInput.toString() : String(dateInput);
    }
};


export const allAmenities = [
    "Wi-Fi", "Laundry", "Kitchen", "Furnished", "Parking", "Study Area",
    "Air Conditioning", "Gym Access", "Common Room", "Bike Storage", "Garden",
    "Library Access", "Balcony", "River View", "Pet Friendly", "Swimming Pool"
].sort();
export const allAccommodationTypes: Property['type'][] = ['Single Room', 'Shared Room', 'Apartment', 'House'];
export const allGenderPreferences: Property['genderPreference'][] = ['Male', 'Female', 'Mixed', 'Any'];

export const allCities = [
  "Beitbridge", "Bindura", "Bulawayo", "Chegutu", "Chinhoyi",
  "Chipinge", "Chiredzi", "Chitungwiza", "Epworth", "Gokwe",
  "Gwanda", "Gweru", "Harare", "Hwange", "Kadoma", "Kariba",
  "Karoi", "Kwekwe", "Marondera", "Masvingo", "Mutare",
  "Norton", "Plumtree", "Redcliff", "Rusape", "Ruwa", "Shamva",
  "Shurugwi", "Victoria Falls", "Zvishavane"
].sort();


export const mockAIAgentName = "UniNest AI Advisor";

export const mockAIRecommendations: AIPropertySuggestion[] = [
  {
    id: 'prop1',
    name: 'Campus View Apartments',
    imageUrl: 'https://placehold.co/300x200.png?text=AI+Rec+1',
    price: 800,
    location: 'University District, Metro City',
  },
  {
    id: 'prop3',
    name: 'The Scholar\'s Den',
    imageUrl: 'https://placehold.co/300x200.png?text=AI+Rec+2',
    price: 450,
    location: 'Quiet Oaks, Suburbia',
  },
];

// Mock suburbs - replace with actual data source or dynamic fetching if needed
export const allSuburbs = ["Suburb A", "Suburb B", "Suburb C"];
