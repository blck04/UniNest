
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPropertyById, getReviewsForProperty, addReview as saveReviewToMockData } from '@/lib/data';
import type { Property, Review, Landlord } from '@/lib/types';
import PropertyImageCarousel from '@/components/property/PropertyImageCarousel';
import StarRating from '@/components/reviews/StarRating';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewForm from '@/components/reviews/ReviewForm';
import ShareButton from '@/components/shared/ShareButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Users, DollarSign, Home, Wifi, ParkingCircle, Utensils, Tv, Droplets, CheckCircle, Phone, Mail, CalendarDays, BedDouble, Building, Heart, Edit, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const AmenityIcon = ({ amenity }: { amenity: string }) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'wi-fi': <Wifi className="w-5 h-5 text-primary" />,
    'parking': <ParkingCircle className="w-5 h-5 text-primary" />,
    'kitchen': <Utensils className="w-5 h-5 text-primary" />,
    'furnished': <BedDouble className="w-5 h-5 text-primary" />,
    'laundry': <Droplets className="w-5 h-5 text-primary" />,
    'study area': <Tv className="w-5 h-5 text-primary" />, 
  };
  const normalizedAmenity = amenity.toLowerCase();
  return iconMap[normalizedAmenity] || <CheckCircle className="w-5 h-5 text-primary" />;
};


export default function PropertyDetailPage() {
  const rawParams = useParams();
  const router = useRouter();
  
  const [pageId, setPageId] = useState<string>('');
  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  const auth = useAuth(); 
  const { toast } = useToast();
  const isSaved = auth.user && property ? auth.isPropertySaved(property.id) : false;

  useEffect(() => {
    if (rawParams && typeof rawParams.id === 'string') {
      setPageId(rawParams.id);
    } else if (rawParams && Array.isArray(rawParams.id)) {
      setPageId(rawParams.id[0] || '');
    } else {
      setPageId('');
    }
  }, [rawParams]);

  useEffect(() => {
    if (pageId) {
      setIsLoading(true);
      const fetchPropertyDetails = async () => {
        try {
            const fetchedProperty = await getPropertyById(pageId);
            if (fetchedProperty) {
              setProperty(fetchedProperty);
              const fetchedReviews = await getReviewsForProperty(pageId);
              setReviews(fetchedReviews);
            } else {
              toast({title: "Not Found", description: "Property not found.", variant: "destructive"});
              router.push('/search'); 
            }
        } catch (error) {
            console.error("Error fetching property details:", error);
            toast({title: "Error", description: "Could not load property details.", variant: "destructive"});
            router.push('/search'); 
        } finally {
            setIsLoading(false);
        }
      };
      fetchPropertyDetails();
    }
  }, [pageId, router, toast]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth.user) {
      toast({ title: "Login Required", description: "Please login to save properties.", variant: "destructive" });
      router.push(`/login?redirect=/property/${pageId}`);
      return;
    }
    if (property) {
      auth.toggleSaveProperty(property.id);
      toast({
        title: isSaved ? "Property Unsaved" : "Property Saved!",
        description: isSaved ? `${property.name} removed from your saved list.` : `${property.name} added to your saved list.`,
      });
    }
  };

 const handleReviewSubmitted = (newReview: Review) => {
    if (!newReview || typeof newReview.id !== 'string' || newReview.id.trim() === '') {
        console.warn("Attempted to add an invalid review object or review with invalid ID. Skipping.", newReview);
        return; // Do not process if newReview or its id is invalid
    }
    setReviews(prevReviews => {
        // Check if a review with the same ID already exists
        const existingReviewIndex = prevReviews.findIndex(r => r.id === newReview.id);
        if (existingReviewIndex !== -1) {
            console.warn(`Attempted to add a review with a duplicate ID via UI: ${newReview.id}. Updating existing.`);
            // Optionally, update the existing review if behavior is to replace/update
            // const updatedReviews = [...prevReviews];
            // updatedReviews[existingReviewIndex] = newReview;
            // return updatedReviews;
            return prevReviews; // For now, just skip if duplicate to avoid key errors
        }
        return [newReview, ...prevReviews]; 
    });
  };


  useEffect(() => {
    if (property && reviews.length > 0) { 
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const newAverage = parseFloat((totalRating / reviews.length).toFixed(1));

        if (property.averageRating !== newAverage) {
            setProperty(prevProperty => prevProperty ? { ...prevProperty, averageRating: newAverage } : null);
        }
    } else if (property && reviews.length === 0 && property.averageRating !== 0) {
        setProperty(prevProperty => prevProperty ? { ...prevProperty, averageRating: 0 } : null);
    }
  }, [reviews, property]);


  if (isLoading || !pageId) {
    return <PropertyDetailSkeleton />;
  }

  if (!property) {
    return <div className="container mx-auto px-4 py-8 text-center text-xl text-muted-foreground">Property details are currently unavailable or the property was not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PropertyImageCarousel images={property.images} propertyName={property.name} />
          
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <CardTitle className="text-3xl md:text-4xl font-headline text-primary mb-2 sm:mb-0">{property.name}</CardTitle>
                <div className="flex items-center space-x-4">
                  {property.averageRating && property.averageRating > 0 ? (
                    <div className="flex items-center space-x-2">
                      <StarRating rating={property.averageRating} readOnly size={28} />
                      <span className="text-xl font-semibold">({reviews.length} reviews)</span>
                    </div>
                  ): (reviews.length === 0 && <span className="text-sm text-muted-foreground">No reviews yet</span>)}
                   {auth.user && auth.user.role === 'student' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "rounded-full p-2 text-primary transition-colors hover:bg-primary/10",
                        isSaved && "text-red-500 fill-red-500 hover:text-red-600 hover:fill-red-600 hover:bg-red-500/10"
                      )}
                      onClick={handleSaveToggle}
                      aria-label={isSaved ? "Unsave property" : "Save property"}
                    >
                      <Heart className={cn("w-7 h-7", isSaved && "fill-current")} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center text-muted-foreground mt-2">
                <MapPin className="w-5 h-5 mr-2 text-primary shrink-0" />
                <span>{property.address}, {property.suburb}, {property.city}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-foreground mb-6">{property.description}</p>
              
              <Separator className="my-6" />

              <h3 className="text-2xl font-semibold mb-4">Key Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-foreground mb-6">
                <div className="flex items-center"><Home className="w-5 h-5 mr-2 text-primary"/> Type: {property.type}</div>
                <div className="flex items-center"><Users className="w-5 h-5 mr-2 text-primary"/> Capacity: {property.capacity}</div>
                <div className="flex items-center"><Building className="w-5 h-5 mr-2 text-primary"/> Gender: {property.genderPreference}</div>
                <div className="flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-primary"/> Available: {(property.availability || []).map(a => a.from && a.from.toLocaleDateString ? `${a.from.toLocaleDateString()}${a.to && a.to.toLocaleDateString ? ` - ${a.to.toLocaleDateString()}`: ''}` : 'Date N/A').join(', ') || 'Not specified'}</div>
              </div>

              <Separator className="my-6" />

              <h3 className="text-2xl font-semibold mb-4">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {(property.amenities || []).map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                    <AmenityIcon amenity={amenity} />
                    <span className="text-sm text-foreground">{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                reviews.map((review) => <ReviewCard key={review.id} review={review} />)
              ) : (
                <p className="text-muted-foreground">No reviews yet for this property.</p>
              )}
            </CardContent>
          </Card>
          
          {auth.isLoading ? (
            <Card className="mt-6"><CardContent className="p-6"><Skeleton className="h-20 w-full bg-muted" /></CardContent></Card>
          ) : auth.user && auth.user.role === 'student' ? (
            <ReviewForm
              propertyId={property.id}
              onReviewSubmitted={handleReviewSubmitted}
              allReviewsForProperty={reviews} 
            />
          ) : !auth.user && property ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Want to share your experience?</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                  Please log in as a student to write a review for this property.
                </p>
                <Button asChild>
                  <Link href={`/login?redirect=/property/${property.id}`}>
                    <LogIn className="w-4 h-4 mr-2" /> Login to Review
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-center">Pricing & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">${property.price}</p>
                <p className="text-muted-foreground">per month</p>
              </div>

              <Separator />

              <h4 className="text-lg font-semibold text-center">Landlord Information</h4>
              <div className="text-center">
                <p className="text-foreground font-medium">{property.landlordName || 'N/A'}</p>
                {showContact ? (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {property.landlordEmail && (
                      <p className="flex items-center justify-center">
                        <Mail className="w-4 h-4 mr-2 text-primary/70"/> {property.landlordEmail}
                      </p>
                    )}
                    {property.landlordPhoneNumber && (
                      <p className="flex items-center justify-center">
                        <Phone className="w-4 h-4 mr-2 text-primary/70"/> {property.landlordPhoneNumber}
                      </p>
                    )}
                    {!property.landlordEmail && !property.landlordPhoneNumber && (
                         <p>Contact details not provided.</p>
                    )}
                    <Button variant="link" size="sm" onClick={() => setShowContact(false)} className="text-xs text-muted-foreground hover:text-primary">Hide Info</Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowContact(true)} className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Show Landlord Info
                  </Button>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-center">
                 <ShareButton propertyId={property.id} propertyName={property.name} />
              </div>
              
            </CardContent>
             <CardFooter>
                {auth.user?.role === 'landlord' && auth.user.uid === property.landlordId ? (
                     <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" asChild>
                        <Link href={`/landlord/properties/edit/${property.id}`}>
                            <Edit className="mr-2 h-5 w-5" /> Edit Your Property
                        </Link>
                    </Button>
                ) : (auth.user?.role === 'student' || !auth.user) ? (
                     <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" asChild>
                        <Link href={`/book/${property.id}`}>
                            Book Now
                        </Link>
                    </Button>
                ): null}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}


function PropertyDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-[400px] w-full bg-muted rounded-lg" />
          <Card className="bg-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Skeleton className="h-10 w-3/4 bg-muted mb-2" />
                <Skeleton className="h-8 w-8 bg-muted rounded-full" />
              </div>
              <Skeleton className="h-6 w-1/2 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full bg-muted mb-2" />
              <Skeleton className="h-5 w-full bg-muted mb-2" />
              <Skeleton className="h-5 w-2/3 bg-muted mb-6" />
              <Separator className="my-6 bg-border" />
              <Skeleton className="h-8 w-1/3 bg-muted mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 w-full bg-muted" />)}
              </div>
              <Separator className="my-6 bg-border" />
              <Skeleton className="h-8 w-1/4 bg-muted mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                    <Skeleton className="h-6 w-6 bg-muted rounded-full" />
                    <Skeleton className="h-4 flex-grow bg-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card"><CardHeader><Skeleton className="h-8 w-1/3 bg-muted" /></CardHeader><CardContent><Skeleton className="h-20 w-full bg-muted" /></CardContent></Card>
          <Card className="bg-card"><CardHeader><Skeleton className="h-8 w-1/3 bg-muted" /></CardHeader><CardContent><Skeleton className="h-40 w-full bg-muted" /></CardContent></Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card shadow-lg"><CardHeader><Skeleton className="h-8 w-1/2 mx-auto bg-muted" /></CardHeader><CardContent className="space-y-4">
            <Skeleton className="h-12 w-1/3 mx-auto bg-muted" />
            <Separator className="bg-border"/>
            <Skeleton className="h-6 w-2/3 mx-auto bg-muted" />
            <Skeleton className="h-10 w-1/2 mx-auto bg-muted" />
            <Separator className="bg-border"/>
            <Skeleton className="h-10 w-1/2 mx-auto bg-muted" />
          </CardContent><CardFooter><Skeleton className="h-12 w-full bg-muted" /></CardFooter></Card>
        </div>
      </div>
    </div>
  );
}
