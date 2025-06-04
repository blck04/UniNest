"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number; // size in pixels
  className?: string;
  readOnly?: boolean;
}

export default function StarRating({
  rating,
  onRatingChange,
  size = 24,
  className,
  readOnly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (index: number) => {
    if (onRatingChange && !readOnly) {
      onRatingChange(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readOnly) {
      setHoverRating(index);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      {[1, 2, 3, 4, 5].map((index) => {
        const effectiveRating = hoverRating || rating;
        const isFilled = index <= effectiveRating;
        return (
          <Star
            key={index}
            className={cn(
              "transition-colors duration-150",
              isFilled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground",
              !readOnly && "cursor-pointer hover:text-yellow-300"
            )}
            style={{ width: size, height: size }}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            aria-label={readOnly ? `Rating: ${rating} out of 5 stars` : `Set rating to ${index} out of 5 stars`}
            role={readOnly ? "img" : "button"}
            tabIndex={readOnly ? -1 : 0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !readOnly) {
                handleClick(index);
              }
            }}
          />
        );
      })}
    </div>
  );
}
