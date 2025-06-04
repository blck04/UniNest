
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getPropertyById, removeEnrolledStudentFromProperty, getEnrollmentsForProperty, getBookingInterestsForProperty, updateBookingInterestStatus } from '@/lib/data';
import type { Property, EnrolledStudent, BookingInterest, Enrollment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Edit2, Trash2, CalendarDays, User, MailCheck, CheckCircle, XCircle, BadgeInfo, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
} from "@/components/ui/dialog";
import StudentEnrollmentForm from '@/components/landlord/StudentEnrollmentForm';
import EnrollFromInterestForm from '@/components/landlord/EnrollFromInterestForm'; // New form
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManagePropertyPage() {
  const rawParams = useParams();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [propertyId, setPropertyId] = useState<string>('');
  const [property, setProperty] = useState<Property | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [bookingInterests, setBookingInterests] = useState<BookingInterest[]>([]);
  
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(true);
  const [isLoadingInterests, setIsLoadingInterests] = useState(true);
  
  const [studentToRemove, setStudentToRemove] = useState<EnrolledStudent | null>(null);
  const [interestToProcess, setInterestToProcess] = useState<BookingInterest | null>(null);
  
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [currentStudentToEdit, setCurrentStudentToEdit] = useState<EnrolledStudent | null>(null);
  const [isEnrollFromInterestFormOpen, setIsEnrollFromInterestFormOpen] = useState(false);


  useEffect(() => {
    const idFromParams = typeof rawParams.id === 'string' ? rawParams.id : Array.isArray(rawParams.id) ? rawParams.id[0] : '';
    setPropertyId(idFromParams);
  }, [rawParams]);

  const loadData = useCallback(async () => {
    if (!propertyId || !auth.user || auth.user.role !== 'landlord') return;

    setIsLoadingProperty(true);
    setIsLoadingEnrollments(true);
    setIsLoadingInterests(true);

    try {
      const fetchedProperty = await getPropertyById(propertyId); 
      if (fetchedProperty && fetchedProperty.landlordId === auth.user.uid) { // Changed auth.user.id to auth.user.uid
        setProperty(fetchedProperty);
      } else if (fetchedProperty) {
        toast({ title: "Access Denied", description: "You do not own this property.", variant: "destructive" });
        router.replace('/landlord/dashboard');
        return;
      } else {
        toast({ title: "Not Found", description: "Property not found.", variant: "destructive" });
        router.replace('/landlord/dashboard');
        return;
      }
    } catch (error) {
      console.error("Error fetching property:", error);
      toast({ title: "Error", description: "Could not load property details.", variant: "destructive" });
    } finally {
      setIsLoadingProperty(false);
    }

    try {
      const fetchedEnrollments = await getEnrollmentsForProperty(propertyId);
      setEnrolledStudents(fetchedEnrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast({ title: "Error", description: "Could not load enrolled students.", variant: "destructive" });
    } finally {
      setIsLoadingEnrollments(false);
    }
    
    try {
      // Fetch interests that are 'pending' or 'contacted'
      const fetchedInterests = await getBookingInterestsForProperty(propertyId, ['pending', 'contacted']); 
      setBookingInterests(fetchedInterests);
    } catch (error) {
      console.error("Error fetching booking interests:", error);
      toast({ title: "Error", description: "Could not load booking interests.", variant: "destructive" });
    } finally {
      setIsLoadingInterests(false);
    }

  }, [propertyId, auth.user, router, toast]);

  useEffect(() => {
    if (!propertyId) return;
    if (!auth.isLoading && !auth.user) {
      router.push(`/login?redirect=/landlord/properties/manage/${propertyId}`);
    } else if (!auth.isLoading && auth.user?.role !== 'landlord') {
      router.replace('/profile');
    } else if (auth.user) {
      loadData();
    }
  }, [auth.isLoading, auth.user, router, propertyId, loadData]);

  // Handlers for manual student enrollment/edit
  const handleOpenAddStudentDialog = () => {
    setCurrentStudentToEdit(null);
    setIsStudentFormOpen(true);
  };
  const handleOpenEditStudentDialog = (student: EnrolledStudent) => {
    setCurrentStudentToEdit(student);
    setIsStudentFormOpen(true);
  };
  const handleStudentFormSuccess = (updatedOrNewEnrollment: Enrollment) => {
    getEnrollmentsForProperty(propertyId).then(setEnrolledStudents);
    setIsStudentFormOpen(false);
  };
  const handleStudentFormDialogClose = () => {
    setIsStudentFormOpen(false);
    setCurrentStudentToEdit(null);
  };
  const handleConfirmRemoveStudent = async () => {
    if (!property || !studentToRemove || !auth.user) return;
    try {
        await removeEnrolledStudentFromProperty(studentToRemove.id, property.id, auth.user.uid);
        setEnrolledStudents(prev => prev.filter(s => s.id !== studentToRemove.id));
        toast({ title: "Student Removed", description: `${studentToRemove.studentName} has been removed.` });
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Could not remove student.", variant: "destructive" });
    }
    setStudentToRemove(null);
  };

  // Handlers for processing booking interests
  const handleDeclineInterest = async (interest: BookingInterest) => {
    const success = await updateBookingInterestStatus(interest.id, 'rejected');
    if (success) {
      toast({ title: "Interest Declined", description: `Application from ${interest.studentName} has been declined.` });
      setBookingInterests(prev => prev.filter(i => i.id !== interest.id));
    } else {
      toast({ title: "Error", description: "Could not decline interest.", variant: "destructive" });
    }
  };

  const handleOpenEnrollFromInterestDialog = (interest: BookingInterest) => {
    setInterestToProcess(interest);
    setIsEnrollFromInterestFormOpen(true);
  };
  
  const handleEnrollFromInterestSuccess = (newEnrollment: Enrollment) => {
    setBookingInterests(prev => prev.filter(i => i.id !== interestToProcess?.id));
    setEnrolledStudents(prev => [newEnrollment, ...prev]); 
    setIsEnrollFromInterestFormOpen(false);
    setInterestToProcess(null);
  };

  const handleEnrollFromInterestDialogClose = () => {
    setIsEnrollFromInterestFormOpen(false);
    setInterestToProcess(null);
  };

  const formatDateForDisplay = (dateInput: Date | string | undefined) => {
    if (!dateInput) return 'N/A';
    try {
      const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return format(dateObj, "MMM dd, yyyy");
    } catch (e) {
      return String(dateInput);
    }
  };

  const isLoading = isLoadingProperty || isLoadingEnrollments || isLoadingInterests;

  if (isLoading && !property) { 
    return (
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Skeleton className="h-8 w-1/4 mb-6 bg-muted"/>
        <Skeleton className="h-24 w-full bg-muted rounded-lg mb-8"/>
        {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
                <CardHeader><Skeleton className="h-8 w-1/3 bg-muted" /></CardHeader>
                <CardContent><Skeleton className="h-32 w-full bg-muted" /></CardContent>
            </Card>
        ))}
      </div>
    );
  }
  
  if (!auth.user || auth.user.role !== 'landlord') {
    return <div className="container mx-auto p-8 text-center">Authenticating or redirecting...</div>;
  }

  if (!property && !isLoadingProperty) {
    return <div className="container mx-auto p-8 text-center">Redirecting...</div>;
  }


  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <Button variant="outline" asChild className="mb-0 border-primary text-primary hover:bg-primary/10">
        <Link href="/landlord/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      {property && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary">Manage: {property.name}</CardTitle>
            <CardDescription className="text-card-foreground">{property.address}, {property.suburb}, {property.city}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Booking Interests Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><MailCheck className="w-7 h-7 mr-3"/>Student Booking Interests</CardTitle>
          <CardDescription>Review and process applications from interested students (status: pending or contacted).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInterests ? <Skeleton className="h-20 w-full bg-muted" /> : bookingInterests.length > 0 ? (
            <div className="space-y-4">
              {bookingInterests.map((interest) => (
                <Card key={interest.id} className="bg-input border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-foreground">{interest.studentName}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">{interest.studentEmail}</CardDescription>
                      </div>
                       <Badge variant={interest.status === 'pending' ? 'secondary' : interest.status === 'contacted' ? 'default' : 'destructive' } className="capitalize text-xs">
                        {interest.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground italic line-clamp-3"><MessageSquare className="w-4 h-4 inline-block mr-1.5 relative -top-0.5"/> {interest.message || "No message provided."}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <p><strong className="font-medium">Proposed Check-in:</strong> {formatDateForDisplay(interest.checkInDate)}</p>
                      <p><strong className="font-medium">Proposed Check-out:</strong> {formatDateForDisplay(interest.checkOutDate)}</p>
                    </div>
                    <div className="flex justify-end space-x-2 pt-3">
                      <Button variant="outline" size="sm" onClick={() => handleDeclineInterest(interest)} className="text-destructive border-destructive hover:bg-destructive/10">
                        <XCircle className="w-4 h-4 mr-1.5" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => handleOpenEnrollFromInterestDialog(interest)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Enroll Student
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending or contacted booking interests for this property.</p>
          )}
        </CardContent>
      </Card>


      {/* Enrolled Students Section */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-primary flex items-center"><User className="w-7 h-7 mr-3"/>Enrolled Students</CardTitle>
          <Button
            onClick={handleOpenAddStudentDialog}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <UserPlus className="w-5 h-5 mr-2" /> Add Student Manually
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingEnrollments ? <Skeleton className="h-32 w-full bg-muted" /> : enrolledStudents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Check-in</TableHead>
                  <TableHead className="text-foreground">Rent Due</TableHead>
                  <TableHead className="text-foreground">Check-out</TableHead>
                  <TableHead className="text-right text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium text-card-foreground flex items-center">
                        <User className="w-4 h-4 mr-2 text-primary/80"/> {student.studentName}
                    </TableCell>
                     <TableCell className="text-card-foreground">
                        <CalendarDays className="w-4 h-4 mr-1 inline-block text-primary/80"/> {formatDateForDisplay(student.checkInDate)}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                        <CalendarDays className="w-4 h-4 mr-1 inline-block text-primary/80"/> {formatDateForDisplay(student.rentDueDate)}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                        <CalendarDays className="w-4 h-4 mr-1 inline-block text-primary/80"/> {formatDateForDisplay(student.checkOutDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 mr-2" onClick={() => handleOpenEditStudentDialog(student)}>
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => setStudentToRemove(student)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No students currently enrolled in this property.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Manual Student Enrollment/Edit */}
      <Dialog open={isStudentFormOpen} onOpenChange={(open) => {
        if (!open) handleStudentFormDialogClose(); else setIsStudentFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {currentStudentToEdit ? 'Edit Student Details' : 'Enroll New Student Manually'}
            </DialogTitle>
            <DialogDescription>
              {currentStudentToEdit ? `Update details for ${currentStudentToEdit.studentName}.` : 'Fill in the details to enroll a new student.'}
            </DialogDescription>
          </DialogHeader>
          {propertyId && auth.user && (
            <StudentEnrollmentForm
              propertyId={propertyId}
              studentToEdit={currentStudentToEdit}
              onSuccess={handleStudentFormSuccess}
              onDialogClose={handleStudentFormDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for Enrolling from Interest */}
      <Dialog open={isEnrollFromInterestFormOpen} onOpenChange={(open) => {
          if (!open) handleEnrollFromInterestDialogClose(); else setIsEnrollFromInterestFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="text-primary">Enroll Student: {interestToProcess?.studentName}</DialogTitle>
            <DialogDescription>
              Confirm check-in, rent due, and check-out dates for {interestToProcess?.studentName} for property: {property?.name}.
            </DialogDescription>
          </DialogHeader>
          {propertyId && interestToProcess && auth.user && (
            <EnrollFromInterestForm
              propertyId={propertyId}
              interest={interestToProcess}
              onSuccess={handleEnrollFromInterestSuccess}
              onDialogClose={handleEnrollFromInterestDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Removing Enrolled Student */}
      {studentToRemove && (
        <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {studentToRemove.studentName} from this property. This action cannot be undone from here (though data remains for record keeping unless hard deleted).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStudentToRemove(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRemoveStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Remove Student
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}


    