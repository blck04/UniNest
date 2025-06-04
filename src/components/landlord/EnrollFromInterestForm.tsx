
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import type { BookingInterest, Enrollment, EnrollFromInterestFormData } from '@/lib/types';
import { enrollStudentFromBookingInterest } from '@/lib/data';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { UserPlus, Save, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const enrollFromInterestSchema = z.object({
  checkInDate: z.string().min(1, "Check-in date is required").refine((val) => !isNaN(Date.parse(val)), {
    message: "Check-in date must be a valid date",
  }),
  rentDueDate: z.string().min(1, "Rent due date is required").refine((val) => !isNaN(Date.parse(val)), {
    message: "Rent due date must be a valid date",
  }),
  checkOutDate: z.string().min(1, "Check-out date is required").refine((val) => !isNaN(Date.parse(val)), {
    message: "Check-out date must be a valid date",
  }),
}).refine(data => {
  try {
    return parseISO(data.rentDueDate) > parseISO(data.checkInDate);
  } catch { return false; }
}, {
    message: "Rent due date must be after check-in date.",
    path: ["rentDueDate"],
}).refine(data => {
  try {
    return parseISO(data.checkOutDate) > parseISO(data.rentDueDate);
  } catch { return false; }
}, {
    message: "Check-out date must be after rent due date.",
    path: ["checkOutDate"],
});

interface EnrollFromInterestFormProps {
  propertyId: string; // Though propertyId is in interest, pass explicitly for safety/clarity
  interest: BookingInterest;
  onSuccess: (newEnrollment: Enrollment) => void;
  onDialogClose: () => void;
}

const getInitialEnrollFormValues = (interest: BookingInterest): EnrollFromInterestFormData => {
  // Use student's proposed dates as initial values, or sensible defaults if missing/invalid
  const proposedCheckIn = interest.checkInDate && !isNaN(interest.checkInDate.valueOf())
    ? interest.checkInDate
    : new Date();
  const proposedCheckOut = interest.checkOutDate && !isNaN(interest.checkOutDate.valueOf()) && interest.checkOutDate > proposedCheckIn
    ? interest.checkOutDate
    : addDays(proposedCheckIn, 180); // Default 6 months lease

  return {
    checkInDate: format(startOfDay(proposedCheckIn), 'yyyy-MM-dd'),
    // Default rent due 7 days after check-in, landlord can adjust
    rentDueDate: format(addDays(startOfDay(proposedCheckIn), 7), 'yyyy-MM-dd'),
    checkOutDate: format(startOfDay(proposedCheckOut), 'yyyy-MM-dd'),
  };
};

export default function EnrollFromInterestForm({
  propertyId,
  interest,
  onSuccess,
  onDialogClose,
}: EnrollFromInterestFormProps) {
  const { toast } = useToast();
  const auth = useAuth();

  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EnrollFromInterestFormData>({
    resolver: zodResolver(enrollFromInterestSchema),
    defaultValues: getInitialEnrollFormValues(interest),
  });

  useEffect(() => {
    reset(getInitialEnrollFormValues(interest));
  }, [interest, reset]);

  const handleFormSubmit = async (data: EnrollFromInterestFormData) => {
    if (!auth.user || auth.user.role !== 'landlord') {
      toast({ title: "Error", description: "Authentication issue.", variant: "destructive" });
      return;
    }
    try {
      const newEnrollment = await enrollStudentFromBookingInterest(interest, data, auth.user.uid);
      if (newEnrollment) {
        toast({ title: "Student Enrolled!", description: `${interest.studentName} has been successfully enrolled in ${interest.propertyName}.` });
        onSuccess(newEnrollment);
        onDialogClose();
      } else {
        throw new Error("Enrollment process did not return a new enrollment object.");
      }
    } catch (error: any) {
      console.error("Error enrolling student from interest:", error);
      toast({ title: "Enrollment Failed", description: error.message || "Could not enroll student. Please try again.", variant: "destructive" });
    }
  };
  
  const DateInput = ({ name, label, control: formControl, errors: formErrors, disabledDateCheck, minDate }: { name: "checkInDate" | "rentDueDate" | "checkOutDate", label: string, control: any, errors: any, disabledDateCheck?: (date: Date) => boolean, minDate?: Date }) => (
    <div>
      <Label htmlFor={name} className="text-foreground">{label}</Label>
      <Controller
        control={formControl}
        name={name}
        render={({ field }) => (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                id={name}
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
                onSelect={(date) => setValue(name, date ? format(startOfDay(date), "yyyy-MM-dd") : '')}
                disabled={disabledDateCheck}
                fromDate={minDate} // fromDate for react-day-picker
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      />
      {formErrors[name] && <p className="text-destructive text-sm mt-1">{formErrors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
      <div>
        <Label className="text-foreground">Student Name</Label>
        <Input value={interest.studentName} readOnly className="bg-muted border-input cursor-not-allowed" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateInput
          name="checkInDate"
          label="Confirmed Check-in"
          control={control}
          errors={errors}
          minDate={startOfDay(new Date())} // Can't be in the past
        />
        <DateInput
          name="rentDueDate"
          label="First Rent Due"
          control={control}
          errors={errors}
          disabledDateCheck={(date) => {
            const checkIn = watch("checkInDate");
            try {
              return checkIn ? date <= parseISO(checkIn) : false;
            } catch { return false; }
          }}
          minDate={watch("checkInDate") ? addDays(parseISO(watch("checkInDate")),1) : addDays(startOfDay(new Date()),1)}
        />
        <DateInput
          name="checkOutDate"
          label="Confirmed Check-out"
          control={control}
          errors={errors}
          disabledDateCheck={(date) => {
            const rentDue = watch("rentDueDate");
            try {
              return rentDue ? date <= parseISO(rentDue) : false;
            } catch { return false; }
          }}
          minDate={watch("rentDueDate") ? addDays(parseISO(watch("rentDueDate")),1) : addDays(startOfDay(new Date()),2)}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onDialogClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
          <UserPlus className="w-4 h-4 mr-2"/>
          {isSubmitting ? 'Enrolling...' : 'Confirm & Enroll Student'}
        </Button>
      </div>
    </form>
  );
}
