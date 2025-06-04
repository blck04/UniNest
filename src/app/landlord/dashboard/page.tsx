
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LogOut, Eye, UserCheck, Users, DollarSign, Edit, PlusCircle, ListChecks, Trash2, ExternalLink, Briefcase, ShieldAlert, KeySquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Property } from '@/lib/types';
import { fetchLandlordPropertiesForDashboard, deleteProperty, getEnrollmentsForProperty } from '@/lib/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


export default function LandlordDashboardPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [propertyToRemove, setPropertyToRemove] = useState<Property | null>(null);
  const [isRemoveConfirmDialogOpen, setIsRemoveConfirmDialogOpen] = useState(false);

  const [isEditAvatarDialogOpen, setIsEditAvatarDialogOpen] = useState(false);
  const [newAvatarFile, setNewAvatarFile] = useState<FileList | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);


  const loadProperties = useCallback(async () => {
    if (auth.user?.role === 'landlord' && auth.user.uid) {
      setIsLoadingData(true);
      const data = await fetchLandlordPropertiesForDashboard(auth.user.uid);
      const propertiesWithCounts = await Promise.all(
        data.map(async (prop) => {
          const enrollments = await getEnrollmentsForProperty(prop.id);
          return { ...prop, enrolledStudentsCount: enrollments.length };
        })
      );
      setProperties(propertiesWithCounts);
      setIsLoadingData(false);
    }
  }, [auth.user]);

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push('/login?redirect=/landlord/dashboard');
    } else if (!auth.isLoading && auth.user?.role !== 'landlord') {
      router.replace('/profile'); 
    } else if (auth.user?.uid) {
      loadProperties();
    }
  }, [auth.isLoading, auth.user, router, loadProperties]);

  const handleLogout = () => {
    auth.logout();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/');
  };

  const handleOpenRemovePropertyDialog = (property: Property) => {
    setPropertyToRemove(property);
    setIsRemoveConfirmDialogOpen(true);
  };

  const handleCloseRemovePropertyDialog = () => {
    setIsRemoveConfirmDialogOpen(false);
    setPropertyToRemove(null);
  };

  const handleConfirmRemoveProperty = async () => {
    if (propertyToRemove && auth.user?.uid) {
        try {
            await deleteProperty(propertyToRemove.id, auth.user.uid);
            toast({ title: "Property Removed", description: `${propertyToRemove.name} has been removed.` });
            loadProperties(); 
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not remove property.", variant: "destructive" });
        }
        handleCloseRemovePropertyDialog();
    } else {
        toast({ title: "Error", description: "Cannot remove property. User or property details missing.", variant: "destructive" });
        handleCloseRemovePropertyDialog();
    }
  };
  
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const dateObj = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(dateObj, "MMM dd, yyyy");
    } catch (e) {
        return typeof dateString === 'string' ? dateString : 'Invalid Date';
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setNewAvatarFile(files);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(files[0]);
    } else {
      setNewAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!newAvatarFile || !newAvatarFile[0] || !auth.user) {
      toast({ title: "No File Selected", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    // Simple client-side validation for file type and size (optional, as AuthContext might also do it)
    const file = newAvatarFile[0];
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Max file size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File Type", description: "Only JPG, PNG, WEBP, GIF are supported.", variant: "destructive" });
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      const success = await auth.updateUserProfile({ profilePictureFile: newAvatarFile[0] });
      if (success) {
        toast({ title: "Profile Picture Updated!", description: "Your new avatar has been saved." });
        setIsEditAvatarDialogOpen(false);
        setAvatarPreview(null); 
        setNewAvatarFile(null);
      } else {
        toast({ title: "Update Failed", description: "Could not update profile picture.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const userInitials = auth.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'L';


  if (auth.isLoading || !auth.user || auth.user.role !== 'landlord' || isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-20 h-20 rounded-full bg-muted" />
          <div>
            <Skeleton className="h-10 w-72 mb-2 bg-muted" />
            <Skeleton className="h-6 w-48 bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full bg-muted rounded-lg" />)}
        </div>
        <Skeleton className="h-8 w-1/4 mb-4 bg-muted" />
        <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
                 <Card key={i} className="bg-card border-border">
                    <CardHeader><Skeleton className="h-6 w-1/2 bg-muted" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full bg-muted" /></CardContent>
                 </Card>
            ))}
        </div>
      </div>
    );
  }
  
  const totalEnrolled = properties.reduce((sum, p) => sum + (p.enrolledStudentsCount || 0), 0);
  const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const upcomingRents = "N/A"; 


  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <div className="relative group">
            <Avatar className="w-20 h-20 border-2 border-primary">
              <AvatarImage src={auth.user.profilePictureUrl || `https://placehold.co/80x80.png?text=${userInitials}`} alt={auth.user.name} data-ai-hint="landlord avatar"/>
              <AvatarFallback className="text-2xl bg-muted">{userInitials}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-1 bg-card hover:bg-accent border-primary/50 group-hover:border-primary text-primary transition-all"
              onClick={() => setIsEditAvatarDialogOpen(true)}
              title="Edit Profile Picture"
            >
              <Edit className="w-4 h-4" />
              <span className="sr-only">Edit Profile Picture</span>
            </Button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Landlord Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {auth.user.name}!</p>
          </div>
        </div>
        <Button onClick={handleLogout} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 self-start sm:self-center">
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </Button>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <ListChecks className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties.length}</div>
              <p className="text-xs text-muted-foreground">Actively listed</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews}</div>
              <p className="text-xs text-muted-foreground">Across all listings</p>
            </CardContent>
          </Card>
           <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
              <UserCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrolled}</div>
              <p className="text-xs text-muted-foreground">Current tenants</p>
            </CardContent>
          </Card>
           <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Rents</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingRents}</div>
              <p className="text-xs text-muted-foreground">Status this month</p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Your Properties</h2>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/landlord/properties/new">
                    <PlusCircle className="w-5 h-5 mr-2" /> Add New Property
                </Link>
            </Button>
        </div>

        {properties.length > 0 ? (
          <div className="space-y-6">
            {properties.map(prop => (
              <Card key={prop.id} className="bg-card border-border shadow-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start">
                    <Link href={`/property/${prop.id}`} target="_blank" rel="noopener noreferrer" className="group">
                        <CardTitle className="text-xl font-headline text-primary group-hover:underline mb-1 sm:mb-0 flex items-center">
                            {prop.name} <ExternalLink className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity"/>
                        </CardTitle>
                    </Link>
                    <div className="flex space-x-2 mt-2 sm:mt-0">
                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" asChild>
                            <Link href={`/landlord/properties/edit/${prop.id}`}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" asChild>
                            <Link href={`/landlord/properties/manage/${prop.id}`}>
                                <Briefcase className="w-4 h-4 mr-2" /> Manage
                            </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenRemovePropertyDialog(prop)}>
                           <Trash2 className="w-4 h-4 mr-2" /> Remove
                       </Button>
                    </div>
                  </div>
                  <CardDescription className="text-card-foreground/80">
                    {prop.address}, {prop.suburb}, {prop.city}
                  </CardDescription>
                   <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <KeySquare className="w-3 h-3 mr-1.5 text-primary/70" /> ID: {prop.id}
                   </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="flex items-center"><Eye className="w-4 h-4 mr-2 text-primary/80" /> Views: <span className="font-semibold ml-1">{prop.viewCount || 0}</span></div>
                    <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-primary/80" /> Interested: <span className="font-semibold ml-1">{prop.interestedCount || 0}</span></div>
                    <div className="flex items-center"><UserCheck className="w-4 h-4 mr-2 text-primary/80" /> Enrolled: <span className="font-semibold ml-1">{prop.enrolledStudentsCount || 0}</span></div>
                  </div>
                  
                  {(prop.enrolledStudentsCount || 0) > 0 && (
                     <p className="text-sm text-muted-foreground">Manage tenants on the &quot;Manage&quot; page for this property.</p>
                  )}
                  {(prop.enrolledStudentsCount || 0) === 0 && (
                     <p className="text-sm text-muted-foreground">No current tenants enrolled for this property.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border text-center py-10">
            <CardContent>
              <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-4">You haven&apos;t listed any properties yet.</p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/landlord/properties/new">
                    <PlusCircle className="w-5 h-5 mr-2" /> List Your First Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <AlertDialog open={isRemoveConfirmDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseRemovePropertyDialog();
          else setIsRemoveConfirmDialogOpen(true);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <ShieldAlert className="w-6 h-6 mr-2 text-destructive"/>Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">This action cannot be undone. This will permanently remove the property listing for &quot;{propertyToRemove?.name}&quot; and all associated data from Firestore.</span>
              <span className="block font-semibold text-destructive-foreground/90">All tenant enrollments, booking interests, and reviews linked to this property ID may become orphaned or should be handled by backend cleanup rules (not yet implemented).</span>
              <span className="block">Please confirm you wish to proceed.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseRemovePropertyDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveProperty} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditAvatarDialogOpen} onOpenChange={setIsEditAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Change Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new image to update your avatar. Max 5MB. Accepted: JPG, PNG, WEBP, GIF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {avatarPreview && (
              <div className="flex justify-center">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={avatarPreview} alt="New avatar preview" />
                  <AvatarFallback>Preview</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div>
              <Label htmlFor="newAvatarFile" className="sr-only">Choose file</Label>
              <Input
                id="newAvatarFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarFileChange}
                className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setAvatarPreview(null); setNewAvatarFile(null); }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateAvatar} disabled={isUpdatingAvatar || !newAvatarFile}>
              {isUpdatingAvatar ? "Uploading..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
