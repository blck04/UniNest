
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PropertyList from '@/components/property/PropertyList';
import { getPropertyById } from '@/lib/data'; // Changed from mockProperties
import type { Property } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { HeartOff } from 'lucide-react';

export default function SavedPropertiesPage() {
  const auth = useAuth();
  const router = useRouter();
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push('/login?redirect=/saved');
    } else if (!auth.isLoading && auth.user && auth.savedPropertyIds) {
      const fetchSavedProperties = async () => {
        setIsLoadingPage(true);
        const propertiesPromises = auth.savedPropertyIds.map(id => getPropertyById(id));
        const fetchedProperties = await Promise.all(propertiesPromises);
        // Filter out any null results (if a property was deleted but ID remained in saved list)
        setSavedProperties(fetchedProperties.filter(p => p !== null) as Property[]);
        setIsLoadingPage(false);
      };
      fetchSavedProperties();
    } else if (!auth.isLoading && auth.user && !auth.savedPropertyIds) {
      // User is loaded, but no savedPropertyIds (e.g., empty array or undefined)
      setSavedProperties([]);
      setIsLoadingPage(false);
    }
  }, [auth.isLoading, auth.user, auth.savedPropertyIds, router]);

  if (isLoadingPage || auth.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-8 bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
    );
  }

  if (!auth.user) {
    // This case should be handled by the redirect, but as a fallback
    return <div className="text-center py-10"><p className="text-xl text-muted-foreground">Please log in to view your saved properties.</p></div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold mb-8 text-foreground">Your Saved Properties</h1>
      {savedProperties.length > 0 ? (
        <PropertyList properties={savedProperties} />
      ) : (
        <div className="text-center py-16 bg-card rounded-lg shadow-lg">
          <HeartOff className="w-16 h-16 mx-auto text-primary mb-6" />
          <h2 className="text-2xl font-semibold text-card-foreground mb-3">No Saved Properties Yet</h2>
          <p className="text-muted-foreground mb-6">
            Start exploring and save your favorite listings to see them here.
          </p>
          <Button asChild variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/search">Explore Properties</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
