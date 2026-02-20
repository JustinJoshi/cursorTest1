"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Role = "admin" | "editor" | "viewer";

interface DocumentItem {
  _id: Id<"documents">;
  name: string;
  createdAt: number;
  updatedAt: number;
  creator: { name: string } | null;
  latestVersion: {
    fileName: string;
    fileSize: number;
    fileType: string;
    versionNumber: number;
    storageId: Id<"_storage">;
  } | null;
  versionCount: number;
}

interface DocumentTableProps {
  documents: DocumentItem[];
  teamId: Id<"teams">;
  userRole: Role;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentTable({
  documents,
  teamId,
  userRole,
}: DocumentTableProps) {
  const [renameDoc, setRenameDoc] = useState<DocumentItem | null>(null);
  const [newName, setNewName] = useState("");

  const renameDocument = useMutation(api.documents.rename);
  const removeDocument = useMutation(api.documents.remove);

  const canEdit = userRole === "admin" || userRole === "editor";
  const canDelete = userRole === "admin";

  const handleRename = async () => {
    if (!renameDoc || !newName.trim()) return;
    try {
      await renameDocument({
        documentId: renameDoc._id,
        name: newName.trim(),
      });
      toast.success("Document renamed");
      setRenameDoc(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename"
      );
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (
      !confirm(
        `Delete "${doc.name}"? This will permanently delete all versions.`
      )
    ) {
      return;
    }
    try {
      await removeDocument({ documentId: doc._id });
      toast.success("Document deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete"
      );
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-muted p-4 mb-4">
          <FileIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
        <p className="text-muted-foreground max-w-sm">
          {canEdit
            ? "Create a new document or upload a file to get started."
            : "No documents have been added to this team yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Latest Version</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Versions</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc._id}>
                <TableCell>
                  <Link
                    href={`/documents/${doc._id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        by {doc.creator?.name ?? "Unknown"}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.latestVersion
                    ? `v${doc.latestVersion.versionNumber}`
                    : "No versions"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.latestVersion
                    ? formatFileSize(doc.latestVersion.fileSize)
                    : "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.versionCount}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Open actions menu"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameDoc(doc);
                              setNewName(doc.name);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!renameDoc}
        onOpenChange={() => setRenameDoc(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDoc(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
