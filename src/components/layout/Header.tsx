
"use client";

import Link from 'next/link';
import { Home, Search, Heart, UserCircle, LogIn, LogOut, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';


export default function Header() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get('search') as string;
    if (searchQuery.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };
  
  const userInitials = auth.user?.name.split(' ').map(n => n[0]).join('').toUpperCase() || (auth.user?.role === 'landlord' ? 'L' : 'S');

  const handleLogout = () => {
    auth.logout();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between">
        <Link href="/" className="text-3xl font-headline font-bold text-primary mb-2 sm:mb-0">
          UniNest
        </Link>
        
        <form onSubmit={handleSearch} className="w-full sm:w-auto flex items-center space-x-2 mb-2 sm:mb-0 sm:flex-grow sm:max-w-md">
          <Input 
            type="search" 
            name="search"
            placeholder="Search by name, location..." 
            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary flex-grow"
          />
          <Button type="submit" variant="default" size="icon">
            <Search className="h-5 w-5" />
          </Button>
        </form>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-primary hover:bg-transparent">
            <Link href="/search">
              <Home className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Browse</span>
            </Link>
          </Button>
          
          {auth.user && auth.user.role === 'student' && (
            <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-primary hover:bg-transparent">
              <Link href="/saved">
                <Heart className="h-5 w-5 sm:mr-1" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
            </Button>
          )}

          {auth.isLoading ? (
            <Button variant="ghost" size="sm" className="text-foreground hover:text-primary hover:bg-transparent" disabled>
              <UserCircle className="h-5 w-5 sm:mr-1 animate-pulse" />
              <span className="hidden sm:inline">Loading...</span>
            </Button>
          ) : auth.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full text-foreground hover:text-primary hover:bg-transparent px-0">
                   <Avatar className="h-8 w-8 border border-primary/50">
                    <AvatarImage src={auth.user.profilePictureUrl || `https://placehold.co/32x32.png?text=${userInitials}`} alt={auth.user.name} data-ai-hint="avatar user" />
                    <AvatarFallback className="bg-muted text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{auth.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {auth.user.email} ({auth.user.role})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={auth.user.role === 'landlord' ? '/landlord/dashboard' : '/profile'}>
                    {auth.user.role === 'landlord' ? <Briefcase className="mr-2 h-4 w-4" /> : <UserCircle className="mr-2 h-4 w-4" />}
                    {auth.user.role === 'landlord' ? 'Dashboard' : 'Profile'}
                  </Link>
                </DropdownMenuItem>
                {auth.user.role === 'student' && (
                  <DropdownMenuItem asChild>
                    <Link href="/saved">
                      <Heart className="mr-2 h-4 w-4" />
                      Saved Properties
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-primary hover:bg-transparent">
              <Link href="/login">
                <LogIn className="h-5 w-5 sm:mr-1" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
