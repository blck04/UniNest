
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, LogOut, Heart, Search, Sparkles, Home, CalendarDays, MapPin, FileText, CreditCard, ShieldAlert, BookUser, School, Edit, Phone, Users, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { StudentRentalInfo, User } from '@/lib/types';
import { getStudentRentalDetails, checkOutStudentFromProperty, formatDateForDisplay } from '@/lib/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const optionalFileValidation = z.custom<FileList>()
  .refine(files => !files || files.length === 0 || (files[0] && files[0].size <= MAX_FILE_SIZE_BYTES), `Max file size is ${MAX_FILE_SIZE_MB}MB.`)
  .refine(files => !files || files.length === 0 || (files[0] && ACCEPTED_IMAGE_TYPES.includes(files[0].type)), "Only JPG, PNG, WEBP, GIF are supported.")
  .optional();


const profileUpdateSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters.").max(100, "Name cannot exceed 100 characters."),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits.").max(15, "Phone number too long."), 
  nationalId: z.string()
    .min(5, "National ID must be at least 5 characters.")
    .max(20, "National ID cannot exceed 20 characters.")
    .optional().or(z.literal('')),
  studentId: z.string() 
    .min(3, "Student ID must be at least 3 characters.")
    .max(20, "Student ID cannot exceed 20 characters.")
    .optional().or(z.literal('')),
  nextOfKinName: z.string()
    .min(2, "Next of kin name must be at least 2 characters.")
    .max(100)
    .optional().or(z.literal('')),
  nextOfKinPhoneNumber: z.string()
    .min(10, "Next of kin phone must be at least 10 digits.")
    .max(15)
    .optional().or(z.literal('')),
  profilePictureFile: optionalFileValidation,
  nationalIdFile: optionalFileValidation,
  studentIdFile: optionalFileValidation,
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [rentalInfo, setRentalInfo] = useState<StudentRentalInfo | null>(null);
  const [isLoadingRental, setIsLoadingRental] = useState(true);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkoutPassword, setCheckoutPassword] = useState('');
  const [checkoutPasswordError, setCheckoutPasswordError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>({});

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting: isUpdatingProfile } } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
  });

  useEffect(() => {
    if (auth.user && isEditModalOpen) { 
      reset({
        name: auth.user.name || '',
        phoneNumber: auth.user.phoneNumber || '',
        nationalId: auth.user.nationalId || '',
        studentId: auth.user.studentId || '',
        nextOfKinName: auth.user.nextOfKinName || '',
        nextOfKinPhoneNumber: auth.user.nextOfKinPhoneNumber || '',
        profilePictureFile: undefined, // Reset file inputs
        nationalIdFile: undefined,
        studentIdFile: undefined,
      });
      setFileErrors({});
    }
  }, [auth.user, reset, isEditModalOpen]);


  const fetchRentalData = useCallback(async () => {
    if (auth.user && auth.user.role === 'student') {
      setIsLoadingRental(true);
      const info = await getStudentRentalDetails(auth.user.uid);
      setRentalInfo(info);
      setIsLoadingRental(false);
    } else {
      setIsLoadingRental(false);
    }
  }, [auth.user]);

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push('/login?redirect=/profile');
    } else if (!auth.isLoading && auth.user?.role === 'landlord') {
      router.replace('/landlord/dashboard');
    } else if (auth.user?.role === 'student') {
      fetchRentalData();
    }
  }, [auth.isLoading, auth.user, router, fetchRentalData]);

  const handleLogout = async () => {
    await auth.logout();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/');
  };

  const handleRequestCheckout = () => {
    setCheckoutPassword('');
    setCheckoutPasswordError('');
    setShowCheckoutDialog(true);
  };

  const confirmCheckout = async () => {
    if (checkoutPassword !== 'password') { 
      setCheckoutPasswordError("Incorrect password. Please try again.");
      return;
    }
    setCheckoutPasswordError('');

    if (auth.user && rentalInfo) {
      const success = await checkOutStudentFromProperty(auth.user.uid, rentalInfo.enrollment.id);
      if (success) {
        toast({ title: "Check-out Successful", description: `You have been checked out from ${rentalInfo.property.name}.` });
        setRentalInfo(null);
        fetchRentalData();
      } else {
        toast({ title: "Check-out Failed", description: "Could not process your check-out. Please contact support.", variant: "destructive" });
      }
    }
    setShowCheckoutDialog(false);
    setCheckoutPassword('');
  };
  
  const validateFileForUpdate = (file: File | undefined, fieldName: string): boolean => {
    if (!file) {
      setFileErrors(prev => ({ ...prev, [fieldName]: null })); // No file means no error for optional update
      return true; 
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileErrors(prev => ({ ...prev, [fieldName]: `Max file size is ${MAX_FILE_SIZE_MB}MB.` }));
      return false;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileErrors(prev => ({ ...prev, [fieldName]: "Only JPG, PNG, WEBP, GIF are supported." }));
      return false;
    }
    setFileErrors(prev => ({ ...prev, [fieldName]: null }));
    return true;
  };


  const onSubmitEditProfile = async (data: ProfileUpdateFormData) => {
    if (!auth.user) return;
    setFileErrors({});

    const isProfilePicValid = validateFileForUpdate(data.profilePictureFile?.[0], 'profilePictureFile');
    let isNationalIdValid = true;
    let isStudentIdValid = true;

    if (auth.user.role === 'student') {
      isNationalIdValid = validateFileForUpdate(data.nationalIdFile?.[0], 'nationalIdFile');
      isStudentIdValid = validateFileForUpdate(data.studentIdFile?.[0], 'studentIdFile');
    }
    
    if (!isProfilePicValid || !isNationalIdValid || !isStudentIdValid) {
        toast({ title: "Update Failed", description: "Please fix the file errors.", variant: "destructive" });
        return;
    }

    const updatePayload: Parameters<typeof auth.updateUserProfile>[0] = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        profilePictureFile: data.profilePictureFile?.[0],
    };
    
    if (auth.user.role === 'student') {
        updatePayload.nationalId = data.nationalId || undefined;
        updatePayload.studentId = data.studentId || undefined;
        updatePayload.nextOfKinName = data.nextOfKinName || undefined;
        updatePayload.nextOfKinPhoneNumber = data.nextOfKinPhoneNumber || undefined;
        updatePayload.nationalIdFile = data.nationalIdFile?.[0];
        updatePayload.studentIdFile = data.studentIdFile?.[0];
    }

    const success = await auth.updateUserProfile(updatePayload);
    if (success) {
      toast({ title: "Profile Updated", description: "Your details have been saved." });
      setIsEditModalOpen(false);
    } else {
      toast({ title: "Update Failed", description: "Could not save your details. Please try again.", variant: "destructive" });
    }
  };

  if (auth.isLoading || !auth.user || (auth.user.role !== 'student' && !auth.isLoading)) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-xl bg-card border-border">
          <CardHeader className="items-center text-center">
            <Skeleton className="w-24 h-24 rounded-full bg-muted mb-4" />
            <Skeleton className="h-8 w-48 bg-muted mb-2" />
            <Skeleton className="h-6 w-64 bg-muted" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
            </div>
             <div className="flex items-center p-3 bg-input rounded-md border border-border">
                <Skeleton className="h-5 w-5 mr-3 bg-muted rounded-full" />
                <Skeleton className="h-6 w-full bg-muted" />
            </div>
            <div className="space-y-4 pt-4 border-t border-border">
                <Skeleton className="h-7 w-1/3 bg-muted mb-3" />
                <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:flex-wrap sm:gap-3">
                    <Skeleton className="h-10 w-full sm:flex-1 bg-muted" />
                    <Skeleton className="h-10 w-full sm:flex-1 bg-muted" />
                    <Skeleton className="h-10 w-full sm:flex-1 bg-muted" />
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Skeleton className="h-6 w-48 bg-muted" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const userInitials = auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <Card className="max-w-2xl mx-auto shadow-xl bg-card border-border">
        <CardHeader className="items-center text-center pb-4">
          <Avatar className="w-28 h-28 mb-4 border-2 border-primary">
            <AvatarImage src={auth.user.profilePictureUrl || `https://placehold.co/112x112.png?text=${userInitials}`} alt={auth.user.name} data-ai-hint="avatar user" />
            <AvatarFallback className="text-4xl bg-muted">{userInitials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-4xl font-headline text-primary">{auth.user.name}</CardTitle>
          <CardDescription className="text-card-foreground mt-1 text-lg">
            Your personal {auth.user.role} hub at UniNest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-card-foreground px-6 pb-6">
          <div className="flex items-center p-3 bg-input rounded-md border border-border text-lg">
            <Mail className="w-5 h-5 mr-3 text-primary shrink-0" />
            <span>{auth.user.email}</span>
          </div>
          <div className="flex items-center p-3 bg-input rounded-md border border-border text-lg">
            <Phone className="w-5 h-5 mr-3 text-primary shrink-0" />
            <span>{auth.user.phoneNumber}</span>
          </div>

          {auth.user.role === 'student' && (auth.user.nationalId || auth.user.studentId || auth.user.nextOfKinName || auth.user.nationalIdPhotoUrl || auth.user.studentIdPhotoUrl) && (
            <div className="pt-4 border-t border-border">
                 <h4 className="text-xl font-semibold text-primary flex items-center mb-3">
                    <BookUser className="w-6 h-6 mr-2 text-primary"/>Academic & ID Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {auth.user.nationalId ? (
                        <div className="flex items-center p-2.5 bg-input rounded-md border border-border">
                             <School className="w-5 h-5 mr-2.5 text-primary shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">National ID</p>
                                <p className="font-medium">{auth.user.nationalId}</p>
                            </div>
                        </div>
                    ) : <p className="text-xs text-muted-foreground col-span-full sm:col-span-1 p-2.5">National ID not set.</p>}
                    {auth.user.studentId ? (
                         <div className="flex items-center p-2.5 bg-input rounded-md border border-border">
                            <School className="w-5 h-5 mr-2.5 text-primary shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Student ID (University/College)</p>
                                <p className="font-medium">{auth.user.studentId}</p>
                            </div>
                        </div>
                    ) : <p className="text-xs text-muted-foreground col-span-full sm:col-span-1 p-2.5">Student ID not set.</p>}
                     {auth.user.nextOfKinName && (
                         <div className="flex items-center p-2.5 bg-input rounded-md border border-border">
                            <Users className="w-5 h-5 mr-2.5 text-primary shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Next of Kin</p>
                                <p className="font-medium">{auth.user.nextOfKinName}</p>
                            </div>
                        </div>
                    )}
                    {auth.user.nextOfKinPhoneNumber && (
                         <div className="flex items-center p-2.5 bg-input rounded-md border border-border">
                            <Phone className="w-5 h-5 mr-2.5 text-primary shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Next of Kin Phone</p>
                                <p className="font-medium">{auth.user.nextOfKinPhoneNumber}</p>
                            </div>
                        </div>
                    )}
                    {auth.user.nationalIdPhotoUrl && (
                        <div className="p-2.5 bg-input rounded-md border border-border">
                            <p className="text-muted-foreground text-xs mb-1">National ID Photo</p>
                            <a href={auth.user.nationalIdPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                                View Document <ExternalLink className="w-3 h-3 ml-1.5"/>
                            </a>
                        </div>
                    )}
                    {auth.user.studentIdPhotoUrl && (
                        <div className="p-2.5 bg-input rounded-md border border-border">
                            <p className="text-muted-foreground text-xs mb-1">Student ID Photo</p>
                            <a href={auth.user.studentIdPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                                View Document <ExternalLink className="w-3 h-3 ml-1.5"/>
                            </a>
                        </div>
                    )}
                </div>
            </div>
          )}


          <div className="space-y-3 pt-6 border-t border-border">
             <h4 className="text-xl font-semibold text-primary flex items-center mb-4">
                <Sparkles className="w-6 h-6 mr-2 text-primary"/>Quick Actions
            </h4>
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:flex-wrap sm:gap-3">
                 <Button variant="outline" className="w-full sm:flex-1 border-primary text-primary hover:bg-primary/10 py-6 text-base" onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="w-5 h-5 mr-2" /> Edit Profile
                </Button>
                {auth.user.role === 'student' && (
                  <Button variant="outline" className="w-full sm:flex-1 border-primary text-primary hover:bg-primary/10 py-6 text-base" asChild>
                      <Link href="/saved">
                          <Heart className="w-5 h-5 mr-2" /> Saved ({auth.savedPropertyIds.length})
                      </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full sm:flex-1 border-primary text-primary hover:bg-primary/10 py-6 text-base" asChild>
                    <Link href="/search">
                        <Search className="w-5 h-5 mr-2" /> Explore Listings
                    </Link>
                </Button>
                 <Button onClick={handleLogout} variant="destructive" className="w-full sm:flex-1 py-6 text-base">
                    <LogOut className="w-5 h-5 mr-2" /> Logout
                </Button>
            </div>
          </div>
        </CardContent>
         <CardFooter className="text-center block pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">User ID: {auth.user.uid} (Role: {auth.user.role})</p>
        </CardFooter>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px]"> {/* Increased width for more fields */}
          <DialogHeader>
            <DialogTitle className="text-primary">Edit Your Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitEditProfile)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" {...register("name")} className="bg-input border-input" />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="edit-phoneNumber">Phone Number</Label>
              <Input id="edit-phoneNumber" type="tel" {...register("phoneNumber")} className="bg-input border-input" />
              {errors.phoneNumber && <p className="text-destructive text-sm mt-1">{errors.phoneNumber.message}</p>}
            </div>
            <div>
                <Label htmlFor="edit-profilePictureFile" className="flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1.5"/> Profile Picture (Optional: upload new to change)
                </Label>
                <Input id="edit-profilePictureFile" type="file" {...register("profilePictureFile")} 
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10" />
                {fileErrors.profilePictureFile && <p className="text-destructive text-sm mt-1">{fileErrors.profilePictureFile}</p>}
            </div>
            {auth.user.role === 'student' && (
              <>
                <div className="pt-2 border-t border-border">
                    <h4 className="text-md font-semibold text-primary mt-2 mb-1">Student Information</h4>
                </div>
                <div>
                  <Label htmlFor="edit-nationalId">National ID Number</Label>
                  <Input id="edit-nationalId" {...register("nationalId")} placeholder="Optional" className="bg-input border-input" />
                  {errors.nationalId && <p className="text-destructive text-sm mt-1">{errors.nationalId.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-studentId">Student ID (University/College)</Label>
                  <Input id="edit-studentId" {...register("studentId")} placeholder="Optional" className="bg-input border-input" />
                  {errors.studentId && <p className="text-destructive text-sm mt-1">{errors.studentId.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-nextOfKinName">Next of Kin Full Name</Label>
                  <Input id="edit-nextOfKinName" {...register("nextOfKinName")} placeholder="Optional" className="bg-input border-input" />
                  {errors.nextOfKinName && <p className="text-destructive text-sm mt-1">{errors.nextOfKinName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-nextOfKinPhoneNumber">Next of Kin Phone Number</Label>
                  <Input id="edit-nextOfKinPhoneNumber" type="tel" {...register("nextOfKinPhoneNumber")} placeholder="Optional" className="bg-input border-input" />
                  {errors.nextOfKinPhoneNumber && <p className="text-destructive text-sm mt-1">{errors.nextOfKinPhoneNumber.message}</p>}
                </div>
                <div>
                    <Label htmlFor="edit-nationalIdFile" className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1.5"/> National ID Photo (Optional: upload new to change)
                    </Label>
                    <Input id="edit-nationalIdFile" type="file" {...register("nationalIdFile")}
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10" />
                    {fileErrors.nationalIdFile && <p className="text-destructive text-sm mt-1">{fileErrors.nationalIdFile}</p>}
                </div>
                <div>
                    <Label htmlFor="edit-studentIdFile" className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1.5"/> Student ID Photo (Optional: upload new to change)
                    </Label>
                    <Input id="edit-studentIdFile" type="file" {...register("studentIdFile")}
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10" />
                    {fileErrors.studentIdFile && <p className="text-destructive text-sm mt-1">{fileErrors.studentIdFile}</p>}
                </div>
              </>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {auth.user.role === 'student' && (isLoadingRental ? (
        <Card className="max-w-2xl mx-auto shadow-xl bg-card border-border">
          <CardHeader><Skeleton className="h-8 w-1/2 bg-muted" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-3/4 bg-muted" />
            <Skeleton className="h-6 w-1/2 bg-muted" />
            <Skeleton className="h-10 w-full bg-muted" />
          </CardContent>
        </Card>
      ) : rentalInfo ? (
        <Card className="max-w-2xl mx-auto shadow-xl bg-card border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <Home className="w-7 h-7 mr-3" /> My Current Rental
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-card-foreground">
            <h3 className="text-xl font-semibold hover:text-primary transition-colors">
              <Link href={`/property/${rentalInfo.property.id}`}>
                {rentalInfo.property.name}
              </Link>
            </h3>
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-2 text-primary/80 shrink-0" />
              <span>{rentalInfo.property.address}, {rentalInfo.property.suburb}, {rentalInfo.property.city}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center p-3 bg-input rounded-md border border-border">
                <CalendarDays className="w-5 h-5 mr-3 text-primary shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Next Rent Due</p>
                  <p className="font-semibold">{formatDateForDisplay(rentalInfo.enrollment.rentDueDate?.toString())}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-input rounded-md border border-border">
                <CalendarDays className="w-5 h-5 mr-3 text-primary shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Lease End / Check-out</p>
                  <p className="font-semibold">{formatDateForDisplay(rentalInfo.enrollment.checkOutDate?.toString())}</p>
                </div>
              </div>
            </div>
             <div className="pt-4 border-t border-border">
              <h4 className="text-lg font-semibold text-primary mb-2 flex items-center"><CreditCard className="w-5 h-5 mr-2"/>Payment History</h4>
              <p className="text-sm text-muted-foreground">
                Payment history feature is coming soon. You'll be able to see all your past transactions here.
              </p>
            </div>
            <Button onClick={handleRequestCheckout} className="w-full mt-4" variant="outline">
              <LogOut className="w-4 h-4 mr-2" /> Request Check-out
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto text-center py-10 bg-card border-border">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Rentals</h3>
            <p className="text-muted-foreground">You are not currently renting any property through UniNest.</p>
            <Button asChild className="mt-4">
              <Link href="/search">Find a Property</Link>
            </Button>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={showCheckoutDialog} onOpenChange={(open) => {
          setShowCheckoutDialog(open);
          if (!open) {
            setCheckoutPassword('');
            setCheckoutPasswordError('');
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <ShieldAlert className="w-6 h-6 mr-2 text-destructive"/>Confirm Check-out
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">You are about to request check-out from &quot;{rentalInfo?.property.name}&quot;.</span>
              <span className="block font-semibold text-destructive-foreground/90">This action is important and may have implications for your lease agreement. Please ensure you understand the terms of your rental before proceeding.</span>
              <span className="block">To continue, please enter your password.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <Label htmlFor="checkout-password">Password</Label>
            <Input
                id="checkout-password"
                type="password"
                value={checkoutPassword}
                onChange={(e) => setCheckoutPassword(e.target.value)}
                className="bg-input border-border"
                placeholder="Enter your password"
            />
            {checkoutPasswordError && (
                <p className="text-sm text-destructive">{checkoutPasswordError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckout} className="bg-destructive hover:bg-destructive/90">
              Confirm Check-out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
