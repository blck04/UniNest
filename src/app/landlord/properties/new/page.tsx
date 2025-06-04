
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2, UploadCloud, ArrowLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from "date-fns";
import { useToast } from '@/hooks/use-toast';
import { addProperty, allAmenities, allAccommodationTypes, allGenderPreferences } from '@/lib/data';
import type { PropertyFormData, PropertyImageFormInput, User } from '@/lib/types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';


const availabilitySchema = z.object({
  from: z.string().min(1, "Start date is required"),
  to: z.string().optional().or(z.literal('')), 
}).refine(data => {
    if (data.from && data.to) {
        try {
            return parseISO(data.to) > parseISO(data.from);
        } catch { return false; }
    }
    return true;
}, {
    message: "End date must be after start date.",
    path: ["to"],
});

const imageSchema = z.object({
  file: z.custom<FileList>()
    .refine(val => val && val.length > 0, "Image file is required.")
    .refine(val => val && val[0] && val[0].size <= 5 * 1024 * 1024, `Max file size is 5MB.`) // 5MB example
    .refine(
      val => val && val[0] && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(val[0].type),
      "Only .jpg, .jpeg, .png, .webp, .gif formats are supported."
    ),
  hint: z.string().min(1, "Hint is required").max(20, "Hint max 2 words (20 chars)"),
});

const propertyFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  suburb: z.string().min(2, "Suburb is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  type: z.enum(['Single Room', 'Shared Room', 'Apartment', 'House']),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  genderPreference: z.enum(['Male', 'Female', 'Mixed', 'Any']),
  amenities: z.array(z.string()).min(1, "Select at least one amenity"),
  price: z.coerce.number().min(1, "Price must be a positive number"),
  availability: z.array(availabilitySchema).min(1, "At least one availability period is required"),
  images: z.array(imageSchema).min(1, "At least one image is required").max(5, "Maximum 5 images"),
});

export default function AddPropertyPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      suburb: '',
      description: '',
      type: 'Apartment',
      capacity: 1,
      genderPreference: 'Any',
      amenities: [],
      price: 100,
      availability: [{ from: format(new Date(), "yyyy-MM-dd"), to: '' }],
      images: [{ file: undefined as unknown as FileList, hint: 'exterior view' }],
    },
  });

  const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
    control,
    name: "availability",
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images",
  });

  useEffect(() => {
    if (!auth.isLoading && (!auth.user || auth.user.role !== 'landlord')) {
      router.replace('/login?redirect=/landlord/properties/new');
    }
  }, [auth.isLoading, auth.user, router]);

  const onSubmit = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    if (!auth.user || auth.user.role !== 'landlord' || !auth.user.email || !auth.user.phoneNumber) {
      toast({ 
        title: "Authentication or Profile Error", 
        description: "You must be logged in as a landlord with complete profile (including email and phone) to list a property.", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const newProperty = await addProperty(data, auth.user as User); 
      if (newProperty) {
        toast({ title: "Property Listed!", description: `${newProperty.name} has been successfully listed.` });
        router.push('/landlord/dashboard');
      } else {
        toast({ title: "Listing Failed", description: "Could not list property. The operation returned an unexpected result.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Property listing submission error:", error);
      toast({
        title: "Listing Failed",
        description: error.message || "An unexpected error occurred while listing the property.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (auth.isLoading || !auth.user || auth.user.role !== 'landlord') {
     return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/4 mb-6 bg-muted"/>
        <Card className="max-w-3xl mx-auto bg-card border-border">
            <CardHeader>
                <Skeleton className="h-10 w-1/2 bg-muted"/>
                <Skeleton className="h-6 w-3/4 bg-muted mt-2"/>
            </CardHeader>
            <CardContent className="space-y-8">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-3 p-4 border border-border rounded-md">
                        <Skeleton className="h-6 w-1/3 bg-muted mb-3"/>
                        <Skeleton className="h-10 w-full bg-muted"/>
                        {i % 2 === 0 && <Skeleton className="h-10 w-full bg-muted"/>}
                    </div>
                ))}
                <Skeleton className="h-12 w-full bg-muted"/>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button variant="outline" asChild className="mb-6 border-primary text-primary hover:bg-primary/10">
        <Link href="/landlord/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="max-w-3xl mx-auto shadow-xl bg-card border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">List New Property</CardTitle>
          <CardDescription className="text-card-foreground">Fill in the details to add your property to UniNest.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-3 p-4 border border-border rounded-md">
              <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
              <div>
                <Label htmlFor="name">Property Name</Label>
                <Input id="name" {...register("name")} className="bg-input" />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} className="bg-input"/>
                {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} className="bg-input"/>
                  {errors.city && <p className="text-destructive text-sm mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <Label htmlFor="suburb">Suburb/Area</Label>
                  <Input id="suburb" {...register("suburb")} className="bg-input"/>
                  {errors.suburb && <p className="text-destructive text-sm mt-1">{errors.suburb.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} rows={4} className="bg-input"/>
                {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
              </div>
            </div>

             <div className="space-y-3 p-4 border border-border rounded-md">
                <h3 className="text-lg font-semibold text-primary">Property Specifics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="type">Accommodation Type</Label>
                        <Controller
                            control={control}
                            name="type"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="type" className="bg-input"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {allAccommodationTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.type && <p className="text-destructive text-sm mt-1">{errors.type.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="capacity">Capacity (persons)</Label>
                        <Input id="capacity" type="number" {...register("capacity")} className="bg-input"/>
                        {errors.capacity && <p className="text-destructive text-sm mt-1">{errors.capacity.message}</p>}
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="genderPreference">Gender Preference</Label>
                         <Controller
                            control={control}
                            name="genderPreference"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="genderPreference" className="bg-input"><SelectValue placeholder="Select preference" /></SelectTrigger>
                                <SelectContent>
                                    {allGenderPreferences.map(pref => <SelectItem key={pref} value={pref}>{pref}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.genderPreference && <p className="text-destructive text-sm mt-1">{errors.genderPreference.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="price">Price (per month)</Label>
                        <Input id="price" type="number" step="0.01" {...register("price")} className="bg-input"/>
                        {errors.price && <p className="text-destructive text-sm mt-1">{errors.price.message}</p>}
                    </div>
                </div>
            </div>
            
            <div className="space-y-3 p-4 border border-border rounded-md">
              <Label className="text-lg font-semibold text-primary">Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allAmenities.map(amenity => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      onCheckedChange={(checked) => {
                        const currentAmenities = watch("amenities") || [];
                        if (checked) {
                          setValue("amenities", [...currentAmenities, amenity]);
                        } else {
                          setValue("amenities", currentAmenities.filter(a => a !== amenity));
                        }
                      }}
                      checked={watch("amenities")?.includes(amenity)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor={`amenity-${amenity}`} className="font-normal">{amenity}</Label>
                  </div>
                ))}
              </div>
              {errors.amenities && <p className="text-destructive text-sm mt-1">{errors.amenities.message}</p>}
            </div>

            <div className="space-y-3 p-4 border border-border rounded-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-primary">Availability Periods</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendAvailability({ from: format(new Date(), "yyyy-MM-dd"), to: '' })}>
                        <PlusCircle className="w-4 h-4 mr-2"/> Add Period
                    </Button>
                </div>
                 {availabilityFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                        <div>
                            <Label htmlFor={`availability.${index}.from`}>From</Label>
                            <Controller
                              control={control}
                              name={`availability.${index}.from`}
                              render={({ field: controllerField }) => (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      id={`availability.${index}.from`}
                                      className={cn(
                                        "w-full justify-start text-left font-normal bg-input",
                                        !controllerField.value && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {controllerField.value ? format(parseISO(controllerField.value), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={controllerField.value ? parseISO(controllerField.value) : undefined}
                                      onSelect={(date) =>
                                        setValue(`availability.${index}.from`, date ? format(date, "yyyy-MM-dd") : '')
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            />
                            {errors.availability?.[index]?.from && <p className="text-destructive text-sm mt-1">{errors.availability[index]?.from?.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor={`availability.${index}.to`}>To (Optional)</Label>
                             <Controller
                              control={control}
                              name={`availability.${index}.to`}
                              render={({ field: controllerField }) => (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      id={`availability.${index}.to`}
                                      className={cn(
                                        "w-full justify-start text-left font-normal bg-input",
                                        !controllerField.value && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {controllerField.value ? format(parseISO(controllerField.value), "PPP") : <span>Pick an end date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={controllerField.value ? parseISO(controllerField.value) : undefined}
                                      onSelect={(date) =>
                                        setValue(`availability.${index}.to`, date ? format(date, "yyyy-MM-dd") : '')
                                      }
                                      disabled={(date) => {
                                        const fromDateString = watch(`availability.${index}.from`);
                                        if (!fromDateString || isNaN(Date.parse(fromDateString))) return false; 
                                        return date < parseISO(fromDateString);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            />
                            {errors.availability?.[index]?.to && <p className="text-destructive text-sm mt-1">{errors.availability[index]?.to?.message}</p>}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAvailability(index)} className="text-destructive hover:bg-destructive/10 self-end mb-1" disabled={availabilityFields.length <= 1}>
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                    </div>
                ))}
                {errors.availability && typeof errors.availability.message === 'string' && <p className="text-destructive text-sm mt-1">{errors.availability.message}</p>}
            </div>

             <div className="space-y-3 p-4 border border-border rounded-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-primary">Property Images (Max 5)</h3>
                     <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendImage({ file: undefined as unknown as FileList, hint: 'room view' })} 
                        disabled={imageFields.length >= 5}
                     >
                        <UploadCloud className="w-4 h-4 mr-2"/> Add Image Slot
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">Upload clear images of the property. Max 5MB per image. Accepted: JPG, PNG, WebP, GIF.</p>
                {imageFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                        <div>
                            <Label htmlFor={`images.${index}.file`}>Image File</Label>
                            <Input 
                                id={`images.${index}.file`} 
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                {...register(`images.${index}.file`)} 
                                className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10"
                            />
                            {errors.images?.[index]?.file && <p className="text-destructive text-sm mt-1">{errors.images[index]?.file?.message as string}</p>}
                        </div>
                         <div>
                            <Label htmlFor={`images.${index}.hint`}>AI Hint (1-2 words)</Label>
                            <Input id={`images.${index}.hint`} {...register(`images.${index}.hint`)} placeholder="e.g., bedroom interior" className="bg-input"/>
                            {errors.images?.[index]?.hint && <p className="text-destructive text-sm mt-1">{errors.images[index]?.hint?.message}</p>}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)} className="text-destructive hover:bg-destructive/10 self-end mb-1" disabled={imageFields.length <= 1}>
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                    </div>
                ))}
                {errors.images && typeof errors.images.message === 'string' && <p className="text-destructive text-sm mt-1">{errors.images.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Submitting...' : 'List Property'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

