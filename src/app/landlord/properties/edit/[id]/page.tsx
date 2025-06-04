
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { CalendarIcon, PlusCircle, Trash2, UploadCloud, ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from "date-fns";
import { useToast } from '@/hooks/use-toast';
import { getPropertyById, updateProperty, allAmenities, allAccommodationTypes, allGenderPreferences } from '@/lib/data';
import type { Property, PropertyFormData, PropertyImageFormInput, User } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
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

// Schema for new image uploads during edit
const imageEditSchema = z.object({
  file: z.custom<FileList>()
    .refine(val => val && val.length > 0, "Image file is required.")
    .refine(val => val && val[0] && val[0].size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
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
  // 'images' here refers to *new* images being uploaded to replace existing ones.
  // It's optional: if no new images are uploaded, existing ones are kept.
  images: z.array(imageEditSchema).max(5, "Maximum 5 new images").optional(), 
});

export default function EditPropertyPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const propertyId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, watch, setValue, reset } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    // Default values for 'images' (new uploads) should be an empty array or undefined
    defaultValues: { 
      images: [], 
    },
  });

  // This field array is for *new* images to upload, which will replace all existing ones if provided.
  const { fields: newImageFields, append: appendNewImage, remove: removeNewImage } = useFieldArray({
    control,
    name: "images",
  });
  
  const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
    control,
    name: "availability",
  });
  
  const loadProperty = useCallback(async () => {
    if (!propertyId || !auth.user) return;
    setIsLoadingPage(true);
    const fetchedProperty = await getPropertyById(propertyId); 
    if (fetchedProperty && fetchedProperty.landlordId === auth.user.uid) { 
      setPropertyToEdit(fetchedProperty);
    } else if (fetchedProperty) {
      toast({ title: "Access Denied", description: "You do not own this property.", variant: "destructive" });
      router.replace('/landlord/dashboard');
    } else {
      toast({ title: "Not Found", description: "Property not found.", variant: "destructive" });
      router.replace('/landlord/dashboard');
    }
    setIsLoadingPage(false);
  }, [propertyId, auth.user, router, toast]);

  useEffect(() => {
    if (!auth.isLoading && (!auth.user || auth.user.role !== 'landlord')) {
      router.replace(`/login?redirect=/landlord/properties/edit/${propertyId}`);
    } else if (auth.user) {
      loadProperty();
    }
  }, [auth.isLoading, auth.user, router, propertyId, loadProperty]);

  useEffect(() => {
    if (propertyToEdit) {
      reset({
        name: propertyToEdit.name,
        address: propertyToEdit.address,
        city: propertyToEdit.city,
        suburb: propertyToEdit.suburb,
        description: propertyToEdit.description,
        type: propertyToEdit.type,
        capacity: Number(propertyToEdit.capacity),
        genderPreference: propertyToEdit.genderPreference,
        amenities: propertyToEdit.amenities,
        price: Number(propertyToEdit.price),
        availability: propertyToEdit.availability.map(a => ({
          from: format(a.from, 'yyyy-MM-dd'),
          to: a.to ? format(a.to, 'yyyy-MM-dd') : '',
        })),
        images: [], // Reset new image uploads section
      });
    }
  }, [propertyToEdit, reset]);

  const onSubmit = async (data: PropertyFormData) => {
    if (!auth.user || !propertyToEdit || !auth.user.email || !auth.user.phoneNumber) {
        toast({ 
            title: "User Profile Incomplete", 
            description: "Your landlord profile (email or phone) is missing. Please update it before editing properties.", 
            variant: "destructive" 
        });
        return; 
    }
    setIsSubmitting(true);
    try {
      await updateProperty(propertyToEdit.id, data, auth.user as User);
      toast({ title: "Property Updated!", description: `${data.name} has been successfully updated.` });
      router.push('/landlord/dashboard');
    } catch (error) {
      toast({ title: "Update Failed", description: (error as Error).message || "Could not update property.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (auth.isLoading || isLoadingPage || !auth.user || auth.user.role !== 'landlord') {
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

  if (!propertyToEdit && !isLoadingPage) { 
      return <div className="container mx-auto p-8 text-center">Redirecting...</div>;
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
          <CardTitle className="text-3xl font-headline text-primary">Edit Property: {propertyToEdit?.name}</CardTitle>
          <CardDescription className="text-card-foreground">Update the details for your property.</CardDescription>
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                                        return fromDateString ? date < parseISO(fromDateString) : false;
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
                <h3 className="text-lg font-semibold text-primary">Current Images</h3>
                {propertyToEdit && propertyToEdit.images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {propertyToEdit.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square">
                        <Image src={img.url} alt={`Current image ${idx + 1} for ${propertyToEdit.name}`} fill className="rounded-md object-cover border border-border" data-ai-hint={img.hint}/>
                        <p className="text-xs absolute bottom-1 left-1 bg-black/50 text-white px-1 rounded">{img.hint}</p>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No current images for this property.</p>
                )}
            </div>

             <div className="space-y-3 p-4 border border-border rounded-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-primary">Upload New Images (Replaces All Existing)</h3>
                     <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendNewImage({ file: undefined as unknown as FileList, hint: '' })} 
                        disabled={newImageFields.length >= 5}
                     >
                        <UploadCloud className="w-4 h-4 mr-2"/> Add Image Slot
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">If you upload new images here, they will replace all current images. Max 5MB per image. Accepted: JPG, PNG, WebP, GIF.</p>
                {newImageFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                        <div>
                            <Label htmlFor={`images.${index}.file`}>New Image File</Label>
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeNewImage(index)} className="text-destructive hover:bg-destructive/10 self-end mb-1" disabled={newImageFields.length <= 1 && watch('images')?.length === 1 && !watch('images')?.[0]?.file?.length}>
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                    </div>
                ))}
                {errors.images && typeof errors.images.message === 'string' && <p className="text-destructive text-sm mt-1">{errors.images.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
              <Save className="w-5 h-5 mr-2"/>
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

