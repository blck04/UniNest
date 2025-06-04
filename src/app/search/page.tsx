
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PropertyList from '@/components/property/PropertyList';
import FilterPanel from '@/components/property/FilterPanel';
import { getAllProperties } from '@/lib/data'; // Changed from mockProperties
import type { Property, SearchFilters } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [allFetchedProperties, setAllFetchedProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

  // Fetch all properties once on initial load or if searchParams suggest a full reload might be needed.
  useEffect(() => {
    const fetchInitialProperties = async () => {
      setIsLoading(true);
      const fetched = await getAllProperties();
      setAllFetchedProperties(fetched);
      // Initial filter application based on URL params
      const keyword = searchParams.get('keyword') || undefined;
      const initialFiltersFromUrl: SearchFilters = { keyword };
      // TODO: Parse other filter params from URL here if they are implemented (e.g., price, type)
      // For now, only keyword from URL is directly applied as an initial filter.
      // Other filters will be set by FilterPanel interaction.
      setCurrentFilters(initialFiltersFromUrl); 
      applyClientSideFilters(fetched, initialFiltersFromUrl); // Apply initial filters
      setIsLoading(false);
    };
    fetchInitialProperties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Re-filter if URL search params change.

  const applyClientSideFilters = (
    propertiesToFilter: Property[],
    filters: SearchFilters
  ) => {
    let tempFiltered = [...propertiesToFilter];

    if (filters.keyword) {
      const query = filters.keyword.toLowerCase();
      tempFiltered = tempFiltered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.suburb.toLowerCase().includes(query)
      );
    }
    
    if (filters.location && filters.location !== 'all') { 
      tempFiltered = tempFiltered.filter(p => p.city.toLowerCase() === filters.location?.toLowerCase());
    }
    if (filters.priceMin) {
      tempFiltered = tempFiltered.filter(p => p.price >= filters.priceMin!);
    }
    if (filters.priceMax) {
      tempFiltered = tempFiltered.filter(p => p.price <= filters.priceMax!);
    }
    if (filters.accommodationType && filters.accommodationType.length > 0) {
      tempFiltered = tempFiltered.filter(p => filters.accommodationType!.includes(p.type));
    }
    if (filters.genderPreference && filters.genderPreference !== 'Any' && filters.genderPreference !== 'all') { // Added 'all' check from select
      tempFiltered = tempFiltered.filter(p => p.genderPreference === filters.genderPreference || p.genderPreference === 'Any');
    }
    if (filters.amenities && filters.amenities.length > 0) {
      tempFiltered = tempFiltered.filter(p => filters.amenities!.every(a => p.amenities.includes(a)));
    }
    
    setFilteredProperties(tempFiltered);
  };

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setIsLoading(true); 
    setCurrentFilters(newFilters);
    applyClientSideFilters(allFetchedProperties, newFilters);
    setIsLoading(false);
  }, [allFetchedProperties]); 


  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card p-4 rounded-lg shadow space-y-3">
          <Skeleton className="h-48 w-full bg-muted" />
          <Skeleton className="h-6 w-3/4 bg-muted" />
          <Skeleton className="h-4 w-1/2 bg-muted" />
          <Skeleton className="h-4 w-1/3 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold mb-8 text-foreground">Search Properties</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/4">
          <FilterPanel 
            initialFilters={currentFilters} 
            onFilterChange={handleFilterChange}
            propertyCount={isLoading ? 0 : filteredProperties.length}
          />
        </div>
        <div className="w-full lg:w-3/4">
          {isLoading && filteredProperties.length === 0 ? ( 
            <LoadingSkeleton />
          ) : (
            <PropertyList properties={filteredProperties} />
          )}
        </div>
      </div>
    </div>
  );
}


export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoadingSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageLoadingSkeleton() {
  return (
     <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-1/3 mb-8 bg-muted" />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/4">
          <Skeleton className="h-[600px] w-full bg-muted rounded-lg" />
        </div>
        <div className="w-full lg:w-3/4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card p-4 rounded-lg shadow space-y-3">
                <Skeleton className="h-48 w-full bg-muted" />
                <Skeleton className="h-6 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
                <Skeleton className="h-4 w-1/3 bg-muted" />
                <Skeleton className="h-10 w-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

