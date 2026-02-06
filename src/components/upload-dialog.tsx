"use client";

import { useState, useRef, ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
import { Upload, FileIcon, X } from "lucide-react";
import { toast } from "sonner";

interface UploadDialogProps {
  teamId: Id<"teams">;
  documentId?: Id<"documents">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

export function UploadDialog({
  teamId,
  documentId,
  open,
  onOpenChange,
  children,
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [comment, setComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(
    api.documentVersions.generateUploadUrl
  );
  const createDocument = useMutation(api.documents.create);
  const createVersion = useMutation(
    api.documentVersions.createVersion
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!docName && !documentId) {
        setDocName(
          selectedFile.name.replace(/\.[^/.]+$/, "")
        );
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      // Step 3: Create document if needed
      let targetDocId = documentId;
      if (!targetDocId) {
        targetDocId = await createDocument({
          name: docName.trim() || file.name,
          teamId,
        });
      }

      // Step 4: Create version record
      await createVersion({
        documentId: targetDocId,
        storageId: storageId as Id<"_storage">,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        comment: comment.trim() || undefined,
      });

      toast.success(
        documentId
          ? "New version uploaded"
          : "Document uploaded"
      );

      // Reset state
      setFile(null);
      setDocName("");
      setComment("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setDocName("");
      setComment("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {documentId ? "Upload New Version" : "Upload Document"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
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
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  Click to select a file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Any file type supported
                </p>
              </button>
            )}
          </div>

          {/* Document name (only for new documents) */}
          {!documentId && (
            <div className="space-y-2">
              <Label htmlFor="docName">Document Name</Label>
              <Input
                id="docName"
                placeholder="Enter document name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                disabled={isUploading}
              />
            </div>
          )}

          {/* Version comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Comment{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Describe what changed in this version..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isUploading}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
