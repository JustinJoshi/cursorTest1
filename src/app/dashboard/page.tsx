"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TeamCard } from "@/components/team-card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const teams = useQuery(api.teams.list);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your teams and documents
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/new">
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Link>
        </Button>
      </div>

      {teams === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-muted p-4 mb-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Create your first team to start managing and collaborating on
            documents.
          </p>
          <Button asChild>
            <Link href="/teams/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team._id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
