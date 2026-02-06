"use client";

import Link from "next/link";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2 mr-8">
          <FileText className="h-6 w-6 text-primary" />
          <Link href="/dashboard" className="font-semibold text-lg">
            DocVault
          </Link>
        </div>

        <nav className="flex items-center gap-4 flex-1">
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </SignedIn>
        </nav>

        <div className="flex items-center gap-4">
          <SignedOut>
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
