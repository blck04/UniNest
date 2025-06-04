
"use client";

import React, { useState, useEffect } from 'react';
import type { SearchFilters, Property } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { allAmenities, allAccommodationTypes, allGenderPreferences, allCities, allSuburbs } from '@/lib/data';
import { X } from 'lucide-react';

interface FilterPanelProps {
  initialFilters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  propertyCount: number; 
}

const MAX_PRICE = 2000; 

export default function FilterPanel({ initialFilters, onFilterChange, propertyCount }: FilterPanelProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [priceRange, setPriceRange] = useState<[number, number]>([initialFilters.priceMin || 0, initialFilters.priceMax || MAX_PRICE]);

  useEffect(() => {
    setFilters(initialFilters);
    setPriceRange([initialFilters.priceMin || 0, initialFilters.priceMax || MAX_PRICE]);
  }, [initialFilters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: keyof SearchFilters) => (value: string) => {
     setFilters(prev => ({ ...prev, [name]: value === 'all' ? undefined : value }));
  };

  const handleAccommodationTypeChange = (type: Property['type']) => {
    const currentTypes = filters.accommodationType || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setFilters(prev => ({ ...prev, accommodationType: newTypes.length > 0 ? newTypes : undefined }));
  };

  const handleAmenityChange = (amenity: string) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    setFilters(prev => ({ ...prev, amenities: newAmenities.length > 0 ? newAmenities : undefined }));
  };

  const handlePriceChange = (newRange: [number, number]) => {
    setPriceRange(newRange);
  };

  const applyFilters = () => {
    onFilterChange({
      ...filters,
      priceMin: priceRange[0] === 0 ? undefined : priceRange[0],
      priceMax: priceRange[1] === MAX_PRICE ? undefined : priceRange[1],
    });
  };
  
  const resetFilters = () => {
    const resetState: SearchFilters = { keyword: initialFilters.keyword }; 
    setFilters(resetState);
    setPriceRange([0, MAX_PRICE]);
    onFilterChange(resetState);
  };


  return (
    <Card className="p-6 bg-card shadow-lg border-border sticky top-24">
      <h3 className="text-2xl font-headline font-semibold mb-6 text-foreground">Filter Properties</h3>
      <Accordion type="multiple" defaultValue={['location', 'price']} className="w-full space-y-4">
        
        <AccordionItem value="location">
          <AccordionTrigger className="text-lg font-medium hover:text-primary">Location</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <div>
              <Label htmlFor="city" className="text-sm">City</Label>
              <Select value={filters.location || 'all'} onValueChange={handleSelectChange('location')}>
                <SelectTrigger id="city" className="bg-input border-border focus:ring-primary">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {allCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger className="text-lg font-medium hover:text-primary">Price Range</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}{priceRange[1] === MAX_PRICE ? '+' : ''}</span>
            </div>
            <Slider
              min={0}
              max={MAX_PRICE}
              step={50}
              value={priceRange}
              onValueChange={handlePriceChange}
              className="[&>span:first-child]:h-1 [&>span:first-child>span]:bg-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="type">
          <AccordionTrigger className="text-lg font-medium hover:text-primary">Accommodation Type</AccordionTrigger>
          <AccordionContent className="space-y-2 pt-3">
            {allAccommodationTypes.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.accommodationType?.includes(type) || false}
                  onCheckedChange={() => handleAccommodationTypeChange(type)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor={`type-${type}`} className="font-normal">{type}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="gender">
          <AccordionTrigger className="text-lg font-medium hover:text-primary">Gender Preference</AccordionTrigger>
          <AccordionContent className="pt-3">
             <Select value={filters.genderPreference || 'Any'} onValueChange={handleSelectChange('genderPreference')}>
                <SelectTrigger id="genderPreference" className="bg-input border-border focus:ring-primary">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {allGenderPreferences.map(pref => <SelectItem key={pref} value={pref}>{pref}</SelectItem>)}
                </SelectContent>
              </Select>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="amenities">
          <AccordionTrigger className="text-lg font-medium hover:text-primary">Amenities</AccordionTrigger>
          <AccordionContent className="space-y-2 pt-3 max-h-60 overflow-y-auto">
            {allAmenities.map(amenity => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={filters.amenities?.includes(amenity) || false}
                  onCheckedChange={() => handleAmenityChange(amenity)}
                   className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor={`amenity-${amenity}`} className="font-normal">{amenity}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 space-y-3">
        <Button onClick={applyFilters} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          Apply Filters ({propertyCount} results)
        </Button>
        <Button onClick={resetFilters} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
           <X className="w-4 h-4 mr-2" /> Reset Filters
        </Button>
      </div>
    </Card>
  );
}

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-card text-card-foreground rounded-lg border ${className}`}>{children}</div>
);
