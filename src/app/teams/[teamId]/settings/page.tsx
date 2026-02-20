"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { MemberManager } from "@/components/member-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function TeamSettingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const team = useQuery(api.teams.get, {
    teamId: teamId as Id<"teams">,
  });
  const members = useQuery(api.teams.getMembers, {
    teamId: teamId as Id<"teams">,
  });
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const router = useRouter();

  if (team === undefined || members === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (team.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          Only team admins can access settings.
        </p>
        <Button asChild>
          <Link href={`/teams/${teamId}`}>Go Back</Link>
        </Button>
      </div>
    );
  }

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this team? This will permanently delete all documents and versions."
      )
    ) {
      return;
    }

    try {
      await deleteTeam({ teamId: teamId as Id<"teams"> });
      toast.success("Team deleted");
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete team"
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/teams/${teamId}`} aria-label="Back to team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground text-sm">
            {team.name}
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage who has access to this team and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberManager
            teamId={teamId as Id<"teams">}
            members={members}
            currentUserRole={team.role}
            teamCreatorId={team.createdBy}
          />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this team and all its documents. This
            action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDeleteTeam}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Team
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
