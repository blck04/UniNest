export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground py-6 text-center border-t border-border mt-auto">
      <div className="container mx-auto px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} UniNest. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Your Hub for Student Accommodation
        </p>
      </div>
    </footer>
  );
}
