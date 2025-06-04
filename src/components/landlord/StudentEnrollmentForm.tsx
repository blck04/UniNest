
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
import type { Property, EnrolledStudent, StudentEnrollmentFormData } from '@/lib/types';
import { addEnrolledStudentToProperty, editEnrolledStudentInProperty } from '@/lib/data';
import { format, addDays, parseISO } from 'date-fns';
import { UserPlus, Save, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const studentEnrollmentSchema = z.object({
  name: z.string().min(2, "Student name must be at least 2 characters"),
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

interface StudentEnrollmentFormProps {
  propertyId: string;
  studentToEdit?: EnrolledStudent | null;
  onSuccess: (updatedProperty: Property) => void;
  onDialogClose: () => void;
}

const getInitialFormValues = (student?: EnrolledStudent | null): StudentEnrollmentFormData => {
  if (student) {
    return {
      name: student.name,
      checkInDate: student.checkInDate ? format(parseISO(student.checkInDate), 'yyyy-MM-dd') : '',
      rentDueDate: student.rentDueDate ? format(parseISO(student.rentDueDate), 'yyyy-MM-dd') : '',
      checkOutDate: student.checkOutDate ? format(parseISO(student.checkOutDate), 'yyyy-MM-dd') : '',
    };
  }
  return {
    name: '',
    checkInDate: format(new Date(), 'yyyy-MM-dd'),
    rentDueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    checkOutDate: format(new Date(new Date().setMonth(new Date().getMonth() + 6)), 'yyyy-MM-dd'),
  };
};


export default function StudentEnrollmentForm({
  propertyId,
  studentToEdit,
  onSuccess,
  onDialogClose,
}: StudentEnrollmentFormProps) {
  const { toast } = useToast();
  const mode = studentToEdit ? 'edit' : 'add';

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StudentEnrollmentFormData>({
    resolver: zodResolver(studentEnrollmentSchema),
    defaultValues: getInitialFormValues(studentToEdit),
  });

  useEffect(() => {
    reset(getInitialFormValues(studentToEdit));
  }, [studentToEdit, reset]);


  const handleFormSubmit = (data: StudentEnrollmentFormData) => {
    let updatedProperty;
    if (mode === 'edit' && studentToEdit) {
      updatedProperty = editEnrolledStudentInProperty(propertyId, studentToEdit.id, data);
      if (updatedProperty) {
        toast({ title: "Student Updated", description: `${data.name}'s details have been updated.` });
        onSuccess(updatedProperty);
      } else {
        toast({ title: "Error", description: "Could not update student.", variant: "destructive" });
      }
    } else {
      updatedProperty = addEnrolledStudentToProperty(propertyId, data);
      if (updatedProperty) {
        toast({ title: "Student Added", description: `${data.name} has been enrolled.` });
        onSuccess(updatedProperty);
      } else {
        toast({ title: "Error", description: "Could not add student.", variant: "destructive" });
      }
    }
    if (updatedProperty) {
      onDialogClose(); 
    }
  };

  const DateInput = ({ name, label, control, errors, disabledDateCheck }: { name: "checkInDate" | "rentDueDate" | "checkOutDate", label: string, control: any, errors: any, disabledDateCheck?: (date: Date) => boolean }) => (
    <div>
      <Label htmlFor={name} className="text-foreground">{label}</Label>
      <Controller
        control={control}
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
                onSelect={(date) => setValue(name, date ? format(date, "yyyy-MM-dd") : '')}
                disabled={disabledDateCheck}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      />
      {errors[name] && <p className="text-destructive text-sm mt-1">{errors[name].message}</p>}
    </div>
  );


  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
      <div>
        <Label htmlFor="name" className="text-foreground">Student Name</Label>
        <Input id="name" {...register("name")} className="bg-input border-input"/>
        {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateInput name="checkInDate" label="Check-in Date" control={control} errors={errors} />
        <DateInput 
          name="rentDueDate" 
          label="Rent Due Date" 
          control={control} 
          errors={errors} 
          disabledDateCheck={(date) => {
            const checkIn = watch("checkInDate");
            return checkIn ? date <= parseISO(checkIn) : false;
          }}
        />
        <DateInput 
          name="checkOutDate" 
          label="Check-out Date" 
          control={control} 
          errors={errors}
          disabledDateCheck={(date) => {
            const rentDue = watch("rentDueDate");
            return rentDue ? date <= parseISO(rentDue) : false;
          }}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onDialogClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {mode === 'edit' ? <Save className="w-4 h-4 mr-2"/> : <UserPlus className="w-4 h-4 mr-2"/>}
          {mode === 'edit' ? 'Save Changes' : 'Enroll Student'}
        </Button>
      </div>
    </form>
  );
}
