import type { Metadata } from 'next';
import { Oswald } from 'next/font/google'; // Import Oswald
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/AuthContext';

// Configure Oswald
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // Oswald has multiple weights
  variable: '--font-oswald', // Define a CSS variable
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UniNest - Student Accommodation Hub',
  description: 'Discover, view, rate, and share student accommodation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", oswald.variable)}>
      <head>
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
