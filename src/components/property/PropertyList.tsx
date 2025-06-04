
import type { Property } from '@/lib/types';
import PropertyCard from './PropertyCard';
// Icon import removed

interface PropertyListProps {
  properties: Property[];
  title?: string;
}

export default function PropertyList({ properties, title }: PropertyListProps) {
  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No properties found.</p>
      </div>
    );
  }

  return (
    <section className="py-8">
      {title && (
        <h2 className="text-4xl font-headline font-semibold mb-6 text-center sm:text-left">
          {/* Icon and flex container removed, title directly rendered */}
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
