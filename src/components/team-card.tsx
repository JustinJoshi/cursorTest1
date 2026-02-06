"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RoleBadge } from "@/components/role-badge";
import { Users, ChevronRight } from "lucide-react";

interface TeamCardProps {
  team: {
    _id: string;
    name: string;
    role: "admin" | "editor" | "viewer";
    createdAt: number;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team._id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{team.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Created{" "}
                  {new Date(team.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <RoleBadge role={team.role} />
        </CardContent>
      </Card>
    </Link>
  );
}
