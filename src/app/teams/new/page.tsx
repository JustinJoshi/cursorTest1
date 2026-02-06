"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewTeamPage() {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createTeam = useMutation(api.teams.create);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const teamId = await createTeam({ name: name.trim() });
      toast.success("Team created successfully");
      router.push(`/teams/${teamId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create team"
      );
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Create a New Team</CardTitle>
          </div>
          <CardDescription>
            Teams let you organize documents and collaborate with others. You
            will be the team admin.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                placeholder="e.g. Engineering, Marketing, Legal..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Team"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
