
import type {z} from 'genkit/zod'; // Keep z import if other schemas use it

export interface User {
  uid: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  role: 'student' | 'landlord';
  nationalId?: string; 
  studentId?: string; 
  nextOfKinName?: string;
  nextOfKinPhoneNumber?: string;
  savedPropertyIds?: string[];
  profilePictureUrl?: string;
  nationalIdPhotoUrl?: string; 
  studentIdPhotoUrl?: string; 
}

export interface PropertyImageFormInput {
  file: FileList | undefined;
  hint: string;
}
export interface PropertyAvailabilityInput {
  from: string;
  to?: string;
}

export interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  suburb: string;
  description: string;
  type: 'Single Room' | 'Shared Room' | 'Apartment' | 'House';
  capacity: number;
  genderPreference: 'Male' | 'Female' | 'Mixed' | 'Any';
  amenities: string[];
  price: number;
  availability: PropertyAvailabilityInput[];
  images: PropertyImageFormInput[];
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  suburb: string;
  description: string;
  type: 'Single Room' | 'Shared Room' | 'Apartment' | 'House';
  capacity: number;
  genderPreference: 'Male' | 'Female' | 'Mixed' | 'Any';
  amenities: string[];
  price: number;
  availability: { from: Date; to?: Date }[];
  images: { url: string; hint: string }[];
  landlordId: string;
  landlordName: string;
  landlordEmail?: string;
  landlordPhoneNumber?: string;
  averageRating?: number;
  viewCount?: number;
  interestedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  enrolledStudentsCount?: number;
}


export interface LandlordProfile {
  uid: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
}


export interface Review {
  id: string;
  propertyId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface SearchFilters {
  keyword?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  accommodationType?: Property['type'][];
  genderPreference?: Property['genderPreference'];
  amenities?: string[];
}

// AIPropertySuggestion and AIPropertySuggestionSchema removed as the feature is temporarily disabled.
// export const AIPropertySuggestionSchema = z.object({
//   id: z.string().describe("The unique ID of the property."),
//   name: z.string().describe("The name of the property listing."),
//   imageUrl: z.string().describe("A publicly accessible URL for an image of the property."),
//   price: z.number().min(1).describe("The monthly rental price of the property."),
//   location: z.string().describe("The general location or address of the property."),
// });
// export type AIPropertySuggestion = z.infer<typeof AIPropertySuggestionSchema>;


export interface Enrollment {
  id: string;
  propertyId: string;
  propertyName: string;
  studentId: string;
  studentName: string;
  landlordId: string;
  checkInDate: Date;
  rentDueDate: Date;
  checkOutDate: Date;
  isActive: boolean;
  actualCheckoutDate?: Date;
}

export interface StudentEnrollmentFormData {
  name: string;
  studentId?: string;
  checkInDate: string;
  rentDueDate: string;
  checkOutDate: string;
}

export interface BookingInterest {
  id: string;
  propertyId: string;
  propertyName: string;
  studentId: string; 
  studentName: string;
  studentEmail: string;
  nationalId: string; 
  studentAppId: string; 
  checkInDate: Date;
  checkOutDate: Date;
  nationalIdPhotoUrl?: string; 
  studentIdPhotoUrl?: string; 
  message?: string;
  status: 'pending' | 'contacted' | 'rejected' | 'accepted' | 'archived';
  submittedAt: Date;
}


export interface BookingInterestFormData {
  propertyId: string;
  propertyName: string;
  studentName: string;
  studentEmail: string;
  nationalId: string;
  studentAppId: string;
  checkInDate: string;
  checkOutDate: string;
  message?: string;
}

export interface StudentRentalInfo {
  property: Property;
  enrollment: Enrollment;
}

export interface EnrollFromInterestFormData {
  checkInDate: string;
  rentDueDate: string;
  checkOutDate: string;
}
