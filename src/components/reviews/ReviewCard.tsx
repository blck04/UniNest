
import type { Review } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StarRating from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const studentInitials =
    review && typeof review.studentName === 'string' && review.studentName.trim() !== ''
      ? review.studentName.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'S';

  return (
    <Card className="mb-4 bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <Avatar className="h-10 w-10">
              <AvatarImage src={`https://placehold.co/40x40.png?text=${studentInitials}`} alt={review.studentName || 'Student'} data-ai-hint="avatar user" />
              <AvatarFallback>{studentInitials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">{review.studentName || 'Anonymous Student'}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {review.date ? new Date(review.date).toLocaleDateString() : 'Date unknown'}
              </p>
            </div>
          </div>
          <StarRating rating={review.rating} size={20} readOnly />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground leading-relaxed">{review.comment || 'No comment provided.'}</p>
      </CardContent>
    </Card>
  );
}
