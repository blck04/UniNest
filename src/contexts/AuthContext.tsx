
"use client";

import type { User } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage } from '@/lib/data'; // Assuming uploadFileToStorage is in data.ts
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string, role: 'student' | 'landlord') => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    phoneNumber: string,
    pass: string,
    role: 'student' | 'landlord',
    nextOfKinName?: string,
    nextOfKinPhoneNumber?: string,
    profilePictureFile?: File,
    nationalIdFile?: File,
    studentIdFile?: File
  ) => Promise<boolean>;
  logout: () => void;
  savedPropertyIds: string[];
  toggleSaveProperty: (propertyId: string) => Promise<void>;
  isPropertySaved: (propertyId: string) => boolean;
  updateUserProfile: (updatedFields: Partial<Omit<User, 'profilePictureUrl' | 'nationalIdPhotoUrl' | 'studentIdPhotoUrl'>> & {
      profilePictureFile?: File,
      nationalIdFile?: File,
      studentIdFile?: File
  }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);

  const mapFirestoreDocToUser = (fbUser: FirebaseUser, firestoreData: any): User => {
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      name: firestoreData.name,
      phoneNumber: firestoreData.phoneNumber,
      role: firestoreData.role,
      nationalId: firestoreData.nationalId,
      studentId: firestoreData.studentId,
      nextOfKinName: firestoreData.nextOfKinName,
      nextOfKinPhoneNumber: firestoreData.nextOfKinPhoneNumber,
      savedPropertyIds: firestoreData.savedPropertyIds || [],
      profilePictureUrl: firestoreData.profilePictureUrl,
      nationalIdPhotoUrl: firestoreData.nationalIdPhotoUrl,
      studentIdPhotoUrl: firestoreData.studentIdPhotoUrl,
    };
  };

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.warn(`User doc for ${firebaseUser.uid} not found on initial read. Retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); 
            userDocSnap = await getDoc(userDocRef);
          }

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            const fullUser = mapFirestoreDocToUser(firebaseUser, userDataFromFirestore);
            setUser(fullUser);
            setSavedPropertyIds(userDataFromFirestore.savedPropertyIds || []);
          } else {
            console.error("User document definitively not found in Firestore for UID:", firebaseUser.uid);
            setUser(null);
            setSavedPropertyIds([]);
             // await signOut(auth); // Consider if this is appropriate
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore for UID " + firebaseUser.uid + ":", error);
          setUser(null);
          setSavedPropertyIds([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setSavedPropertyIds([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, pass: string, role: 'student' | 'landlord'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().role === role) {
        return true;
      } else if (userDocSnap.exists() && userDocSnap.data().role !== role) {
        await signOut(auth); 
        toast({ title: "Login Failed", description: "Role mismatch. Please select the correct role.", variant: "destructive" });
        return false;
      } else {
        await signOut(auth); 
        toast({ title: "Login Failed", description: "User profile not found. Please sign up.", variant: "destructive" });
        return false;
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let description = "Login failed. Please check your email and password.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Invalid email or password. Please try again or sign up if you don't have an account.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
      } else {
        description = error.message || "An unexpected error occurred during login.";
      }
      toast({ title: "Login Failed", description, variant: "destructive" });
      setIsLoading(false); 
      return false;
    }
  };

  const signup = async (
    name: string,
    email: string,
    phoneNumber: string,
    pass: string,
    role: 'student' | 'landlord',
    nextOfKinName?: string,
    nextOfKinPhoneNumber?: string,
    profilePictureFile?: File,
    nationalIdFile?: File,
    studentIdFile?: File
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const userId = firebaseUser.uid;

      let profilePictureUrl: string | undefined;
      if (profilePictureFile) {
        profilePictureUrl = await uploadFileToStorage(profilePictureFile, `profilePictures/${userId}`);
      }

      let nationalIdPhotoUrl: string | undefined;
      if (role === 'student' && nationalIdFile) {
        nationalIdPhotoUrl = await uploadFileToStorage(nationalIdFile, `userDocs/${userId}/nationalId`);
      }

      let studentIdPhotoUrl: string | undefined;
      if (role === 'student' && studentIdFile) {
        studentIdPhotoUrl = await uploadFileToStorage(studentIdFile, `userDocs/${userId}/studentId`);
      }
      
      const newUserProfileData: Omit<User, 'savedPropertyIds'> & { savedPropertyIds?: string[] } = {
        uid: userId,
        name,
        email: firebaseUser.email,
        phoneNumber,
        role,
        profilePictureUrl,
        nextOfKinName: role === 'student' ? nextOfKinName : undefined,
        nextOfKinPhoneNumber: role === 'student' ? nextOfKinPhoneNumber : undefined,
        nationalIdPhotoUrl: role === 'student' ? nationalIdPhotoUrl : undefined,
        studentIdPhotoUrl: role === 'student' ? studentIdPhotoUrl : undefined,
      };

      if (role === 'student') {
        newUserProfileData.savedPropertyIds = [];
      }

      const cleanProfileData: any = {};
      for (const key in newUserProfileData) {
        if ((newUserProfileData as any)[key] !== undefined) {
          cleanProfileData[key] = (newUserProfileData as any)[key];
        }
      }

      await setDoc(doc(db, "users", userId), cleanProfileData);
      return true;
    } catch (error: any) {
      console.error("Signup error:", error);
      let description = "Could not create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already in use. Please login or use a different email.";
      } else if (error.code === 'auth/weak-password') {
        description = "The password is too weak. Please choose a stronger password.";
      } else {
        description = error.message || "An unexpected error occurred during signup.";
      }
      toast({ title: "Signup Failed", description, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const toggleSaveProperty = async (propertyId: string): Promise<void> => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to save properties.", variant: "destructive" });
      return;
    }
    if (user.role !== 'student') {
      toast({ title: "Action Not Allowed", description: "Only students can save properties.", variant: "destructive" });
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const isCurrentlySaved = savedPropertyIds.includes(propertyId);

    try {
      if (isCurrentlySaved) {
        await updateDoc(userDocRef, {
          savedPropertyIds: arrayRemove(propertyId)
        });
        const newSavedIds = savedPropertyIds.filter(id => id !== propertyId);
        setSavedPropertyIds(newSavedIds);
        setUser(prevUser => prevUser ? { ...prevUser, savedPropertyIds: newSavedIds } : null);
      } else {
        await updateDoc(userDocRef, {
          savedPropertyIds: arrayUnion(propertyId)
        });
        const newSavedIds = [...savedPropertyIds, propertyId];
        setSavedPropertyIds(newSavedIds);
        setUser(prevUser => prevUser ? { ...prevUser, savedPropertyIds: newSavedIds } : null);
      }
    } catch (error) {
      console.error("Error toggling saved property in Firestore:", error);
      toast({ title: "Error", description: "Could not update saved properties. Please try again.", variant: "destructive" });
    }
  };

  const isPropertySaved = (propertyId: string): boolean => {
    if (!user || user.role !== 'student') return false;
    return savedPropertyIds.includes(propertyId);
  };

 const updateUserProfile = async (
    updatedFields: Partial<Omit<User, 'profilePictureUrl' | 'nationalIdPhotoUrl' | 'studentIdPhotoUrl'>> & {
        profilePictureFile?: File,
        nationalIdFile?: File,
        studentIdFile?: File
    }
  ): Promise<boolean> => {
    if (!user) return false;
    const userDocRef = doc(db, "users", user.uid);
    
    const { profilePictureFile, nationalIdFile, studentIdFile, ...otherFields } = updatedFields;
    const fieldsToUpdateFirestore: Partial<User> = { ...otherFields };

    try {
      if (profilePictureFile) {
        fieldsToUpdateFirestore.profilePictureUrl = await uploadFileToStorage(profilePictureFile, `profilePictures/${user.uid}`);
      }
      if (user.role === 'student') {
        if (nationalIdFile) {
          fieldsToUpdateFirestore.nationalIdPhotoUrl = await uploadFileToStorage(nationalIdFile, `userDocs/${user.uid}/nationalId`);
        }
        if (studentIdFile) {
          fieldsToUpdateFirestore.studentIdPhotoUrl = await uploadFileToStorage(studentIdFile, `userDocs/${user.uid}/studentId`);
        }
      }
      
      fieldsToUpdateFirestore.email = user.email; 
      fieldsToUpdateFirestore.role = user.role;
      fieldsToUpdateFirestore.uid = user.uid;

      if (fieldsToUpdateFirestore.nationalId === '') fieldsToUpdateFirestore.nationalId = undefined;
      if (fieldsToUpdateFirestore.studentId === '') fieldsToUpdateFirestore.studentId = undefined;

      if (user.role === 'student') {
        if (fieldsToUpdateFirestore.nextOfKinName === '') fieldsToUpdateFirestore.nextOfKinName = undefined;
        if (fieldsToUpdateFirestore.nextOfKinPhoneNumber === '') fieldsToUpdateFirestore.nextOfKinPhoneNumber = undefined;
      } else {
        delete fieldsToUpdateFirestore.nationalId;
        delete fieldsToUpdateFirestore.studentId;
        delete fieldsToUpdateFirestore.nextOfKinName;
        delete fieldsToUpdateFirestore.nextOfKinPhoneNumber;
        delete fieldsToUpdateFirestore.nationalIdPhotoUrl;
        delete fieldsToUpdateFirestore.studentIdPhotoUrl;
      }

      const cleanFieldsToUpdate: any = {};
      for (const key in fieldsToUpdateFirestore) {
        if ((fieldsToUpdateFirestore as any)[key] !== undefined) {
          cleanFieldsToUpdate[key] = (fieldsToUpdateFirestore as any)[key];
        }
      }
      
      if (user.role === 'student' && !('savedPropertyIds' in cleanFieldsToUpdate) && user.savedPropertyIds) {
         cleanFieldsToUpdate.savedPropertyIds = user.savedPropertyIds;
      } else if (user.role === 'landlord') {
          delete cleanFieldsToUpdate.savedPropertyIds;
      }


      if (Object.keys(cleanFieldsToUpdate).length > 0) {
        await updateDoc(userDocRef, cleanFieldsToUpdate);
        setUser(prevUser => prevUser ? { ...prevUser, ...cleanFieldsToUpdate } : null);
        if (updatedFields.savedPropertyIds && Array.isArray(updatedFields.savedPropertyIds)) {
          setSavedPropertyIds(updatedFields.savedPropertyIds);
        }
      }
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      return true;
    } catch (error) {
      console.error("Error updating user profile in Firestore:", error);
      toast({ title: "Profile Update Failed", description: "Could not update your profile.", variant: "destructive" });
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, savedPropertyIds, toggleSaveProperty, isPropertySaved, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
