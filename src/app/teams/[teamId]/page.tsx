"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DocumentTable } from "@/components/document-table";
import { UploadDialog } from "@/components/upload-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoleBadge } from "@/components/role-badge";
import { ArrowLeft, Plus, Settings, FileUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const team = useQuery(api.teams.get, {
    teamId: teamId as Id<"teams">,
  });
  const documents = useQuery(api.documents.list, {
    teamId: teamId as Id<"teams">,
  });

  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createDocument = useMutation(api.documents.create);

  const canEdit =
    team?.role === "admin" || team?.role === "editor";

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;
    setIsCreating(true);
    try {
      await createDocument({
        name: newDocName.trim(),
        teamId: teamId as Id<"teams">,
      });
      toast.success("Document created");
      setNewDocName("");
      setShowCreateDoc(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create document"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (team === undefined || documents === undefined) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-3">
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <RoleBadge role={team.role} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {documents.length} document
            {documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <UploadDialog
                teamId={teamId as Id<"teams">}
                open={showUpload}
                onOpenChange={setShowUpload}
              >
                <Button variant="outline">
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </UploadDialog>

              <Dialog
                open={showCreateDoc}
                onOpenChange={setShowCreateDoc}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="Document name"
                      value={newDocName}
                      onChange={(e) =>
                        setNewDocName(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleCreateDocument();
                      }}
                      autoFocus
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDoc(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateDocument}
                      disabled={
                        !newDocName.trim() || isCreating
                      }
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {team.role === "admin" && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/teams/${teamId}/settings`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <DocumentTable
        documents={documents}
        teamId={teamId as Id<"teams">}
        userRole={team.role}
      />
    </div>
  );
}
