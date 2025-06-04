
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getPropertyById, addBookingInterest } from '@/lib/data';
import type { Property, BookingInterestFormData, User } from '@/lib/types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Home, User as UserIcon, Mail, CalendarIcon, Landmark, CalendarDays } from 'lucide-react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { format, parseISO, addYears, startOfDay } from "date-fns";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const bookingInterestSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  studentName: z.string().min(2, "Full name is required"),
  studentEmail: z.string().email("Invalid email address"),
  nationalId: z.string().min(5, "National ID must be at least 5 characters.").max(20, "National ID cannot exceed 20 characters."),
  studentAppId: z.string().min(3, "Student ID must be at least 3 characters.").max(15, "Student ID cannot exceed 15 characters."),
  checkInDate: z.string().min(1, "Check-in date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid check-in date" }),
  checkOutDate: z.string().min(1, "Check-out date is required").refine(val => !isNaN(Date.parse(val)), { message: "Invalid check-out date" }),
  // nationalIdPhoto and studentIdPhoto removed
  message: z.string().optional(),
}).refine(data => {
  if (data.checkInDate && data.checkOutDate) {
    try {
      return parseISO(data.checkOutDate) > parseISO(data.checkInDate);
    } catch {
      return false; 
    }
  }
  return true; 
}, {
  message: "Check-out date must be after check-in date.",
  path: ["checkOutDate"],
});

export default function BookPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const propertyId = typeof params.propertyId === 'string' ? params.propertyId : '';

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, control, watch } = useForm<BookingInterestFormData>({
    resolver: zodResolver(bookingInterestSchema), 
    defaultValues: {
        studentName: '',
        studentEmail: '',
        nationalId: '',
        studentAppId: '',
        checkInDate: format(startOfDay(new Date()), "yyyy-MM-dd"),
        checkOutDate: format(addYears(startOfDay(new Date()),1) , "yyyy-MM-dd"),
        message: '',
    }
  });

  useEffect(() => {
    if (propertyId) {
      const fetchProp = async () => {
        const fetchedProperty = await getPropertyById(propertyId);
        if (fetchedProperty) {
          setProperty(fetchedProperty);
          setValue("propertyId", fetchedProperty.id);
          setValue("propertyName", fetchedProperty.name);
          if (fetchedProperty.availability && fetchedProperty.availability.length > 0) {
            const firstAvailableFrom = fetchedProperty.availability[0].from;
             if (firstAvailableFrom && (isNaN(Date.parse(watch("checkInDate") || ''))) ) { 
               setValue("checkInDate", format(firstAvailableFrom > startOfDay(new Date()) ? firstAvailableFrom : startOfDay(new Date()), "yyyy-MM-dd"));
             }
          }
        } else {
          toast({ title: "Not Found", description: "Property not found.", variant: "destructive" });
          router.replace('/search');
        }
        setIsLoadingPage(false);
      }
      fetchProp();
    } else {
        setIsLoadingPage(false);
    }
  }, [propertyId, router, toast, setValue, watch]);

  useEffect(() => {
    if (auth.user) {
      if (auth.user.role === 'student') {
        setValue("studentName", auth.user.name || "");
        setValue("studentEmail", auth.user.email || "");
        if (auth.user.nationalId) setValue("nationalId", auth.user.nationalId);
        if (auth.user.studentId) setValue("studentAppId", auth.user.studentId);
      }
    }
  }, [auth.user, setValue]);

  const onSubmit = async (data: BookingInterestFormData) => {
    if (!auth.user || auth.user.role !== 'student') {
      toast({ title: "Error", description: "You must be logged in as a student to apply.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    try {
      await addBookingInterest({
        ...data, 
        studentId: auth.user.uid, 
      });

      toast({
        title: "Application Submitted!",
        description: `Your application for ${data.propertyName} has been sent.`,
      });
      setSubmissionSuccess(true);

      const profileUpdates: Partial<User> = {};
      if (!auth.user.nationalId && data.nationalId) profileUpdates.nationalId = data.nationalId;
      if (!auth.user.studentId && data.studentAppId) profileUpdates.studentId = data.studentAppId; 

      if (Object.keys(profileUpdates).length > 0) {
        await auth.updateUserProfile(profileUpdates);
      }

    } catch (error) {
      console.error("Booking application submission error:", error);
      toast({ title: "Submission Failed", description: (error as Error).message || "Could not submit your application. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPage || (!property && !submissionSuccess)) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/4 mb-6 bg-muted"/>
        <Card className="max-w-2xl mx-auto bg-card border-border">
          <CardHeader><Skeleton className="h-10 w-1/2 bg-muted"/></CardHeader>
          <CardContent className="space-y-6 p-6">
            <Skeleton className="h-40 w-full bg-muted rounded-md"/>
            <Skeleton className="h-6 w-3/4 bg-muted"/>
            <div className="space-y-4 border-t border-border pt-4 mt-4">
                <Skeleton className="h-10 w-full bg-muted"/>
                <Skeleton className="h-10 w-full bg-muted"/>
                <Skeleton className="h-10 w-full bg-muted"/>
                <Skeleton className="h-10 w-full bg-muted"/>
                <Skeleton className="h-10 w-full bg-muted"/>
                <Skeleton className="h-10 w-full bg-muted"/>
            </div>
            <Skeleton className="h-20 w-full bg-muted"/>
            <Skeleton className="h-12 w-full bg-muted mt-4"/>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!auth.isLoading && !auth.user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Mail className="h-4 w-4" />
          <AlertTitle>Login Required</AlertTitle>
          <AlertDescription>
            Please <Link href={`/login?redirect=/book/${propertyId}`} className="font-bold hover:underline text-primary">login</Link> or <Link href={`/signup?redirect=/book/${propertyId}`} className="font-bold hover:underline text-primary">sign up</Link> as a student to apply for this property.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (auth.user && auth.user.role === 'landlord') {
     return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <UserIcon className="h-4 w-4" />
          <AlertTitle>Action Not Allowed</AlertTitle>
          <AlertDescription>
            Landlords cannot apply for properties. Please use a student account.
          </AlertDescription>
        </Alert>
         <Button variant="outline" asChild className="mt-6">
            <Link href="/landlord/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }
  
  if (submissionSuccess && property) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-lg mx-auto bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary font-headline">Thank You, {watch("studentName")}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-card-foreground">Your application for <strong className="text-primary">{property.name}</strong> has been successfully submitted.</p>
            <p className="text-muted-foreground">The landlord will review your details and be in touch via email (if applicable).</p>
            <div className="flex justify-center space-x-4 mt-6">
                <Button variant="default" asChild>
                    <Link href={`/property/${propertyId}`}>View Property Again</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/search">Explore More Properties</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="container mx-auto px-4 py-12">
      <Button variant="outline" asChild className="mb-6 border-primary text-primary hover:bg-primary/10">
        <Link href={property ? `/property/${property.id}` : '/search'}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Property
        </Link>
      </Button>

      {property && (
        <Card className="max-w-2xl mx-auto shadow-xl bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-headline text-primary">Apply for: {property.name}</CardTitle>
            <CardDescription className="text-card-foreground/80 flex items-center pt-1">
              <Home className="w-4 h-4 mr-2 text-primary/70"/> {property.address}, {property.suburb}, {property.city}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
                <Image
                    src={property.images[0]?.url || 'https://placehold.co/600x400.png'}
                    alt={`Image of ${property.name}`}
                    width={600}
                    height={400}
                    className="w-full h-auto max-h-[300px] object-cover rounded-md border border-border"
                    data-ai-hint={property.images[0]?.hint || 'property exterior detail'}
                />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-4 border border-border rounded-md space-y-4">
                <h4 className="text-lg font-semibold text-primary flex items-center"><UserIcon className="w-5 h-5 mr-2"/>Personal Details</h4>
                <div>
                  <Label htmlFor="studentName" className="text-foreground">Full Name</Label>
                  <Input 
                    id="studentName" 
                    {...register("studentName")} 
                    className="bg-input border-input" 
                    readOnly={!!auth.user?.name} 
                  />
                  {errors.studentName && <p className="text-destructive text-sm mt-1">{errors.studentName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="studentEmail" className="text-foreground">Email Address</Label>
                  <Input 
                    id="studentEmail" 
                    type="email" 
                    {...register("studentEmail")} 
                    className="bg-input border-input" 
                    readOnly={!!auth.user?.email} 
                  />
                  {errors.studentEmail && <p className="text-destructive text-sm mt-1">{errors.studentEmail.message}</p>}
                </div>
              </div>

              <div className="p-4 border border-border rounded-md space-y-4">
                <h4 className="text-lg font-semibold text-primary flex items-center"><Landmark className="w-5 h-5 mr-2"/>Academic & ID Details</h4>
                <div>
                  <Label htmlFor="nationalId" className="text-foreground">National ID Number</Label>
                  <Input 
                    id="nationalId" 
                    {...register("nationalId")} 
                    placeholder="Your National ID"
                    className="bg-input border-input" 
                    readOnly={!!auth.user?.nationalId}
                  />
                  {errors.nationalId && <p className="text-destructive text-sm mt-1">{errors.nationalId.message}</p>}
                </div>
                <div>
                  <Label htmlFor="studentAppId" className="text-foreground">Student ID (University/College)</Label>
                  <Input 
                    id="studentAppId" 
                    {...register("studentAppId")} 
                    placeholder="Your Student ID"
                    className="bg-input border-input" 
                    readOnly={!!auth.user?.studentId}
                  />
                  {errors.studentAppId && <p className="text-destructive text-sm mt-1">{errors.studentAppId.message}</p>}
                </div>
              </div>
              
              {/* ID Document Uploads section removed */}

              <div className="p-4 border border-border rounded-md space-y-4">
                <h4 className="text-lg font-semibold text-primary flex items-center"><CalendarDays className="w-5 h-5 mr-2"/>Proposed Tenancy Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="checkInDate">Preferred Check-in Date</Label>
                        <Controller
                            control={control}
                            name="checkInDate"
                            render={({ field }) => (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    id="checkInDate"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-input border-input",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value ? parseISO(field.value) : undefined}
                                    onSelect={(date) => setValue("checkInDate", date ? format(date, "yyyy-MM-dd") : '')}
                                    disabled={(date) => date < startOfDay(new Date()) || date > addYears(new Date(), 2) }
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                            )}
                        />
                        {errors.checkInDate && <p className="text-destructive text-sm mt-1">{errors.checkInDate.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="checkOutDate">Preferred Check-out Date</Label>
                        <Controller
                            control={control}
                            name="checkOutDate"
                            render={({ field }) => (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    id="checkOutDate"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-input border-input",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value ? parseISO(field.value) : undefined}
                                    onSelect={(date) => setValue("checkOutDate", date ? format(date, "yyyy-MM-dd") : '')}
                                    disabled={(date) => {
                                        const checkIn = watch("checkInDate");
                                        if (!checkIn || isNaN(Date.parse(checkIn))) return date < startOfDay(new Date()) || date > addYears(new Date(), 3);
                                        return date <= parseISO(checkIn) || date > addYears(new Date(), 3);
                                      }
                                    }
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                            )}
                        />
                        {errors.checkOutDate && <p className="text-destructive text-sm mt-1">{errors.checkOutDate.message}</p>}
                    </div>
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground">Message to Landlord (Optional)</Label>
                <Textarea 
                  id="message" 
                  {...register("message")} 
                  rows={4} 
                  placeholder="Any specific questions or preferences? (e.g., number of occupants if different from capacity, lease length interest)"
                  className="bg-input border-input"
                />
                 {errors.message && <p className="text-destructive text-sm mt-1">{errors.message.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
                <Send className="w-5 h-5 mr-2"/>
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
