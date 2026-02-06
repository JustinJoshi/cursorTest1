import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Users, Shield, History } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-3xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-primary/10 p-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          DocVault
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Secure document management with version control, team collaboration,
          and role-based access control.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl w-full">
        <div className="text-center space-y-3 p-6 rounded-xl border bg-card">
          <div className="flex justify-center">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Version Control</h3>
          <p className="text-sm text-muted-foreground">
            Track every change with full version history. Download any previous
            version at any time.
          </p>
        </div>
        <div className="text-center space-y-3 p-6 rounded-xl border bg-card">
          <div className="flex justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Team Collaboration</h3>
          <p className="text-sm text-muted-foreground">
            Create teams, invite members, and work together on documents
            seamlessly.
          </p>
        </div>
        <div className="text-center space-y-3 p-6 rounded-xl border bg-card">
          <div className="flex justify-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Role-Based Access</h3>
          <p className="text-sm text-muted-foreground">
            Control who can view, edit, or delete with admin, editor, and viewer
            roles.
          </p>
        </div>
      </div>
    </div>
  );
}
