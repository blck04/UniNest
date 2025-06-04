
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, User, Briefcase, Phone, Image as ImageIcon, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];


export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'landlord'>('student');
  const [nextOfKinName, setNextOfKinName] = useState('');
  const [nextOfKinPhoneNumber, setNextOfKinPhoneNumber] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState<FileList | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<FileList | null>(null);
  const [studentIdFile, setStudentIdFile] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>({});


  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const validateFile = (file: File | undefined, fieldName: string): boolean => {
    if (!file) {
      if (fieldName === 'profilePicture' || (role === 'student' && (fieldName === 'nationalIdFile' || fieldName === 'studentIdFile'))) {
        setFileErrors(prev => ({ ...prev, [fieldName]: "This file is required." }));
        return false;
      }
      setFileErrors(prev => ({ ...prev, [fieldName]: null })); // Clear error if optional and not provided
      return true; // Optional files are valid if not present
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileErrors(prev => ({ ...prev, [fieldName]: `Max file size is ${MAX_FILE_SIZE_MB}MB.` }));
      return false;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileErrors(prev => ({ ...prev, [fieldName]: "Only JPG, PNG, WEBP, GIF are supported." }));
      return false;
    }
    setFileErrors(prev => ({ ...prev, [fieldName]: null }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFileErrors({}); // Clear previous file errors

    if (password !== confirmPassword) {
      toast({ title: "Signup Failed", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    const isProfilePicValid = validateFile(profilePictureFile?.[0], 'profilePicture');
    let isNationalIdValid = true;
    let isStudentIdValid = true;

    if (role === 'student') {
      if (!nextOfKinName.trim() || !nextOfKinPhoneNumber.trim()) {
        toast({ title: "Signup Failed", description: "Next of kin details are required for students.", variant: "destructive" });
        return;
      }
      isNationalIdValid = validateFile(nationalIdFile?.[0], 'nationalIdFile');
      isStudentIdValid = validateFile(studentIdFile?.[0], 'studentIdFile');
    }

    if (!isProfilePicValid || !isNationalIdValid || !isStudentIdValid) {
        toast({ title: "Signup Failed", description: "Please fix the errors in the form.", variant: "destructive" });
        return;
    }


    setIsLoading(true);
    const success = await auth.signup(
      name,
      email,
      phoneNumber,
      password,
      role,
      role === 'student' ? nextOfKinName : undefined,
      role === 'student' ? nextOfKinPhoneNumber : undefined,
      profilePictureFile?.[0],
      role === 'student' ? nationalIdFile?.[0] : undefined,
      role === 'student' ? studentIdFile?.[0] : undefined
    );
    setIsLoading(false);
    if (success) {
      toast({ title: "Signup Successful", description: "Welcome to UniNest! Please login." });
      router.push('/login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Create an Account</CardTitle>
          <CardDescription>Join UniNest to find your perfect student home or list your properties.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>I am a...</Label>
              <RadioGroup defaultValue="student" onValueChange={(value: 'student' | 'landlord') => setRole(value)} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="role-student-signup" />
                  <Label htmlFor="role-student-signup" className="font-normal flex items-center"><User className="w-4 h-4 mr-1" /> Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="landlord" id="role-landlord-signup" />
                  <Label htmlFor="role-landlord-signup" className="font-normal flex items-center"><Briefcase className="w-4 h-4 mr-1" /> Landlord</Label>
                </div>
              </RadioGroup>
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-input border-border focus:ring-primary"
              />
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
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+263 771 234 567"
                required
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profilePictureFile" className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-1.5"/> Profile Picture
              </Label>
              <Input
                id="profilePictureFile"
                type="file"
                onChange={(e) => setProfilePictureFile(e.target.files)}
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                required
                className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10"
              />
              {fileErrors.profilePicture && <p className="text-destructive text-sm mt-1">{fileErrors.profilePicture}</p>}
            </div>

            {role === 'student' && (
              <>
                <div className="pt-2 mt-2 border-t border-border">
                   <Alert variant="default" className="mb-3 bg-input/50">
                     <Info className="h-4 w-4 !text-primary" />
                     <AlertTitle className="text-primary/90">Student Specific Information</AlertTitle>
                     <AlertDescription className="text-muted-foreground">
                       The following details are required for student applications.
                     </AlertDescription>
                   </Alert>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextOfKinName">Next of Kin Full Name</Label>
                  <Input
                    id="nextOfKinName"
                    type="text"
                    value={nextOfKinName}
                    onChange={(e) => setNextOfKinName(e.target.value)}
                    placeholder="Jane Doe"
                    required={role === 'student'}
                    className="bg-input border-border focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextOfKinPhoneNumber">Next of Kin Phone Number</Label>
                  <Input
                    id="nextOfKinPhoneNumber"
                    type="tel"
                    value={nextOfKinPhoneNumber}
                    onChange={(e) => setNextOfKinPhoneNumber(e.target.value)}
                    placeholder="+263 771 987 654"
                    required={role === 'student'}
                    className="bg-input border-border focus:ring-primary"
                  />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="nationalIdFile" className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1.5"/> National ID Photo
                    </Label>
                    <Input
                        id="nationalIdFile"
                        type="file"
                        onChange={(e) => setNationalIdFile(e.target.files)}
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        required={role === 'student'}
                        className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10"
                    />
                    {fileErrors.nationalIdFile && <p className="text-destructive text-sm mt-1">{fileErrors.nationalIdFile}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="studentIdFile" className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1.5"/> Student ID Photo (University/College)
                    </Label>
                    <Input
                        id="studentIdFile"
                        type="file"
                        onChange={(e) => setStudentIdFile(e.target.files)}
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        required={role === 'student'}
                        className="bg-input border-input file:text-primary file:font-semibold hover:file:bg-primary/10"
                    />
                    {fileErrors.studentIdFile && <p className="text-destructive text-sm mt-1">{fileErrors.studentIdFile}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password (min. 6 characters)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-input border-border focus:ring-primary"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-input border-border focus:ring-primary"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
              {isLoading ? 'Creating Account...' : <><UserPlus className="w-5 h-5 mr-2" /> Sign Up</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" asChild className="text-primary p-0 h-auto">
              <Link href="/login">Login</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
