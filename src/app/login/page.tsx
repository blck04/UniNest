
"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogIn, User, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'landlord'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await auth.login(email, password, role);
    setIsLoading(false);
    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      const redirect = searchParams.get('redirect');
      if (role === 'landlord') {
        router.push(redirect || '/landlord/dashboard');
      } else {
        router.push(redirect || '/profile');
      }
    } else {
      toast({ title: "Login Failed", description: "Invalid email, password, or role mismatch.", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Login to UniNest</CardTitle>
        <CardDescription>Access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Login as</Label>
            <RadioGroup defaultValue="student" onValueChange={(value: 'student' | 'landlord') => setRole(value)} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="student" id="role-student" />
                <Label htmlFor="role-student" className="font-normal flex items-center"><User className="w-4 h-4 mr-1" /> Student</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="landlord" id="role-landlord" />
                <Label htmlFor="role-landlord" className="font-normal flex items-center"><Briefcase className="w-4 h-4 mr-1" /> Landlord</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-input border-border focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-input border-border focus:ring-primary"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? 'Logging in...' : <><LogIn className="w-5 h-5 mr-2" /> Login</>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="text-primary p-0 h-auto">
            <Link href="/signup">Sign up</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

function LoginPageSkeleton() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <Skeleton className="h-9 w-3/4 mx-auto bg-muted" />
        <Skeleton className="h-5 w-1/2 mx-auto mt-2 bg-muted" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4 bg-muted" />
          <div className="flex space-x-4">
            <Skeleton className="h-6 w-1/2 bg-muted" />
            <Skeleton className="h-6 w-1/2 bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>
        <Skeleton className="h-10 w-full bg-muted" />
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Skeleton className="h-5 w-3/4 bg-muted" />
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Suspense fallback={<LoginPageSkeleton />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
