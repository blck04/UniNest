
import Link from 'next/link';
import Image from 'next/image';
import type { Property } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, DollarSign, Star, Home, Heart } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const isSaved = auth.user ? auth.isPropertySaved(property.id) : false;

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation when clicking save
    e.stopPropagation();
    if (!auth.user) {
      toast({ title: "Login Required", description: "Please login to save properties.", variant: "destructive"});
      // Potentially redirect to login: router.push('/login?redirect=/property/' + property.id);
      return;
    }
    auth.toggleSaveProperty(property.id);
    toast({
      title: isSaved ? "Property Unsaved" : "Property Saved!",
      description: isSaved ? `${property.name} removed from your saved list.` : `${property.name} added to your saved list.`,
    });
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary group relative">
      {auth.user && ( // Show save button only if user context is available (even if not logged in, to prompt login)
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 z-10 rounded-full bg-card/70 hover:bg-card text-primary transition-colors",
            isSaved && "text-red-500 fill-red-500 hover:text-red-600 hover:fill-red-600"
          )}
          onClick={handleSaveToggle}
          aria-label={isSaved ? "Unsave property" : "Save property"}
        >
          <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
        </Button>
      )}
      <CardHeader className="p-0 relative">
        <Link href={`/property/${property.id}`} className="block">
          <Image
            src={property.images[0]?.url || 'https://placehold.co/400x300.png'}
            alt={`Image of ${property.name}`}
            width={400}
            height={225}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={property.images[0]?.hint || 'building exterior'}
          />
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/property/${property.id}`} className="block">
          <CardTitle className="text-xl font-headline mb-2 hover:text-primary transition-colors duration-200 truncate group-hover:text-primary">
            {property.name}
          </CardTitle>
        </Link>
        <div className="text-sm text-muted-foreground space-y-1 mb-3">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary shrink-0" />
            <span className="truncate">{property.suburb}, {property.city}</span>
          </div>
          <div className="flex items-center">
            <Home className="w-4 h-4 mr-2 text-primary shrink-0" />
            <span>{property.type}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-primary shrink-0" />
            <span>Capacity: {property.capacity}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xl font-bold text-primary">
            ${property.price}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          {property.averageRating && (
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-400 mr-1" fill="currentColor" />
              <span className="font-semibold">{property.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="default" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/property/${property.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
