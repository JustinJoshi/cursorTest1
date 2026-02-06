"use client";

import { use, useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DocumentTable } from "@/components/document-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoleBadge } from "@/components/role-badge";
import { ArrowLeft, Plus, Settings, Upload, FileIcon, X } from "lucide-react";
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
  const [newDocName, setNewDocName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDocument = useMutation(api.documents.create);
  const generateUploadUrl = useMutation(
    api.documentVersions.generateUploadUrl
  );
  const createVersion = useMutation(
    api.documentVersions.createVersion
  );

  const canEdit =
    team?.role === "admin" || team?.role === "editor";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!newDocName) {
        setNewDocName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;
    setIsCreating(true);
    try {
      // Create the document entry
      const docId = await createDocument({
        name: newDocName.trim(),
        teamId: teamId as Id<"teams">,
      });

      // If a file was selected, upload it as the first version
      if (file) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await result.json();

        await createVersion({
          documentId: docId,
          storageId: storageId as Id<"_storage">,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          comment: comment.trim() || undefined,
        });

        toast.success("Document created with file uploaded");
      } else {
        toast.success("Document created");
      }

      setNewDocName("");
      setFile(null);
      setComment("");
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

  const handleDialogClose = (open: boolean) => {
    if (!isCreating) {
      setShowCreateDoc(open);
      if (!open) {
        setNewDocName("");
        setFile(null);
        setComment("");
      }
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
              <Dialog
                open={showCreateDoc}
                onOpenChange={handleDialogClose}
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
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="docName">Document Name</Label>
                      <Input
                        id="docName"
                        placeholder="Enter document name"
                        value={newDocName}
                        onChange={(e) =>
                          setNewDocName(e.target.value)
                        }
                        disabled={isCreating}
                        autoFocus
                      />
                    </div>

                    {/* File upload area */}
                    <div className="space-y-2">
                      <Label>
                        Attach File{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isCreating}
                      />
                      {file ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                          <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setFile(null)}
                            disabled={isCreating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
                        >
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">
                            Click to select a file
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, images, and other file types supported
                          </p>
                        </button>
                      )}
                    </div>

                    {/* Comment field, shown when a file is selected */}
                    {file && (
                      <div className="space-y-2">
                        <Label htmlFor="comment">
                          Comment{" "}
                          <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                          id="comment"
                          placeholder="Describe this version..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          disabled={isCreating}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => handleDialogClose(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateDocument}
                      disabled={
                        !newDocName.trim() || isCreating
                      }
                    >
                      {isCreating
                        ? file
                          ? "Uploading..."
                          : "Creating..."
                        : file
                          ? "Create & Upload"
                          : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
