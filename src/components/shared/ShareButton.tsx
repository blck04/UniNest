
"use client";

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  propertyId: string;
  propertyName: string;
}

export default function ShareButton({ propertyId, propertyName }: ShareButtonProps) {
  const { toast } = useToast();

  const constructPropertyUrl = () => {
    if (typeof window !== 'undefined' && propertyId) {
      return `${window.location.origin}/property/${propertyId}`;
    }
    return '';
  };

  const copyLinkToClipboard = () => {
    const currentPropertyUrl = constructPropertyUrl();
    if (!currentPropertyUrl) {
      toast({ title: "Error", description: "Cannot copy link, property details are missing.", variant: "destructive" });
      return;
    }

    navigator.clipboard.writeText(currentPropertyUrl)
      .then(() => {
        toast({ title: "Link Copied!", description: "Property link copied to clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy link: ", err);
        toast({ title: "Copy Failed", description: "Could not copy link. Please try manually.", variant: "destructive" });
      });
  };

  const handleShare = async () => {
    const currentPropertyUrl = constructPropertyUrl();
    if (!currentPropertyUrl) {
      toast({ title: "Error", description: "Cannot share, property details are missing.", variant: "destructive" });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${propertyName} on UniNest!`,
          text: `I found this great place: ${propertyName}. Take a look!`,
          url: currentPropertyUrl,
        });
      } catch (error) {
        console.error("Error sharing via navigator.share:", error);
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          toast({
            title: "Sharing Permission Denied",
            description: "Your browser or OS blocked sharing. Link copied instead!",
            variant: "default"
          });
        } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
          // Don't toast if user simply cancelled (AbortError)
          toast({
            title: "Sharing Failed",
            description: "Could not share directly. Link copied instead!",
            variant: "default"
          });
        }
        // Fallback to copy for all errors, including AbortError (user might cancel to copy)
        copyLinkToClipboard();
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      toast({ title: "Web Share Not Supported", description: "Copying link to clipboard instead." });
      copyLinkToClipboard();
    }
  };

  return (
    <Button onClick={handleShare} variant="outline" className="border-primary text-primary hover:bg-primary/10" disabled={!propertyId}>
      <Share2 className="w-4 h-4 mr-2" />
      Share
    </Button>
  );
}
