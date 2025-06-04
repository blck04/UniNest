
"use client"; 

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import PropertyList from '@/components/property/PropertyList';
// import AIRecommendations from '@/components/ai/AIRecommendations'; // Removed
import { getAllProperties } from '@/lib/data';
import type { Property } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      const fetchedProperties = await getAllProperties();
      setAllProperties(fetchedProperties);
      setIsLoading(false);
    };
    fetchProperties();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };
  
  const FeaturedPropertiesSkeleton = () => (
    <section className="py-8">
      <h2 className="text-3xl font-headline font-semibold mb-6 text-center sm:text-left">
        <Skeleton className="h-9 w-1/3 bg-muted" />
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card p-4 rounded-lg shadow space-y-3">
            <Skeleton className="h-48 w-full bg-muted" />
            <Skeleton className="h-6 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/2 bg-muted" />
            <Skeleton className="h-4 w-1/3 bg-muted" />
            <Skeleton className="h-10 w-full bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );


  return (
    <div className="space-y-8">
      {/* Hero Section with Search */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--background))] rounded-lg shadow-xl text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold mb-8 uppercase text-primary">
            Find Your Perfect Student Home
          </h1>
          <p className="text-lg md:text-xl text-card-foreground mb-8 max-w-2xl mx-auto">
            Discover, compare, and secure your ideal student accommodation with UniNest.
          </p>
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter location, property name, or keywords..."
              className="h-12 text-lg bg-input border-border focus:ring-primary flex-grow"
              aria-label="Search for accommodation"
            />
            <Button type="submit" className="h-12 text-lg px-8">
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </form>
           <Button variant="link" onClick={() => router.push('/search')} className="mt-4 text-primary hover:text-primary/80">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Advanced Search & Filters
          </Button>
        </div>
      </section>

      {/* AI Recommendations Section Removed */}
      {/* <AIRecommendations /> */}

      {/* Browse Properties Section */}
      {isLoading ? (
        <FeaturedPropertiesSkeleton />
      ) : (
        <PropertyList properties={allProperties.slice(0, 8)} title="Explore Listings" />
      )}
      
      {!isLoading && allProperties.length > 8 && (
         <div className="text-center mt-8">
            <Button onClick={() => router.push('/search')} variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                View All Properties
            </Button>
         </div>
      )}
       {!isLoading && allProperties.length === 0 && (
         <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">No properties currently listed. Check back soon!</p>
         </div>
      )}
    </div>
  );
}
