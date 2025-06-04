
"use client";

import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Review } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addReview as saveReview } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ReviewFormProps {
  propertyId: string;
  onReviewSubmitted: (newReview: Review) => void;
  allReviewsForProperty: Review[]; // Pass all reviews for this property
}

export default function ReviewForm({ propertyId, onReviewSubmitted, allReviewsForProperty }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const auth = useAuth(); // Get auth context

  // Determine if the current user has already reviewed this property
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  useEffect(() => {
    if (auth.user && auth.user.role === 'student' && allReviewsForProperty) {
      const userReview = allReviewsForProperty.find(review => review.studentId === auth.user!.uid);
      setHasUserReviewed(!!userReview);
    } else {
      setHasUserReviewed(false); // Reset if user logs out or reviews change
    }
  }, [auth.user, allReviewsForProperty]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.user || auth.user.role !== 'student') {
      toast({ title: "Authentication Error", description: "You must be logged in as a student to submit a review.", variant: "destructive" });
      return;
    }
    
    if (hasUserReviewed) {
      toast({ title: "Review Already Submitted", description: "You have already reviewed this property.", variant: "default" });
      return;
    }

    if (rating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Comment Required", description: "Please write a comment.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newReviewData = {
        propertyId,
        studentId: auth.user.uid,
        studentName: auth.user.name, // Use authenticated user's name
        rating,
        comment
      };
      const submittedReview = await saveReview(newReviewData); // saveReview is async
      
      onReviewSubmitted(submittedReview);
      toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
      setRating(0);
      setComment('');
      // No need to reset studentName as it's not an input anymore
      setHasUserReviewed(true); // Update local state immediately
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message || "Could not submit review. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not logged in or not a student, this component shouldn't render (handled by parent)
  // But as an additional safeguard, or if parent logic changes:
  if (!auth.user || auth.user.role !== 'student') {
    // This case should ideally be handled by the parent component (PropertyDetailPage)
    // by not rendering ReviewForm at all. Included for robustness if direct rendering occurs.
    return null; 
  }

  if (hasUserReviewed) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-lg border border-border text-center">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Review Submitted</h3>
        <p className="text-muted-foreground">You've already shared your thoughts on this property. Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-card rounded-lg shadow-lg border border-border">
      <h3 className="text-2xl font-headline font-semibold text-foreground">Write a Review</h3>
      
      {/* Name field removed - will use auth.user.name */}
      <p className="text-sm text-muted-foreground">You are posting as: <span className="font-semibold text-primary">{auth.user.name}</span></p>

      <div>
        <Label className="block text-sm font-medium text-foreground mb-1">Your Rating</Label>
        <StarRating rating={rating} onRatingChange={setRating} size={28} />
      </div>

      <div>
        <Label htmlFor="comment" className="block text-sm font-medium text-foreground mb-1">Your Review</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={4}
          className="bg-input border-border focus:ring-primary"
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}
