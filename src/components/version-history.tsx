"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Download, History } from "lucide-react";

interface Version {
  _id: Id<"documentVersions">;
  documentId: Id<"documents">;
  storageId: Id<"_storage">;
  versionNumber: number;
  uploadedBy: Id<"users">;
  comment?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: number;
  uploader: {
    _id: Id<"users">;
    name: string;
    email: string;
    imageUrl?: string;
  } | null;
}

interface VersionHistoryProps {
  documentId: Id<"documents">;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function VersionDownloadButton({
  storageId,
  fileName,
}: {
  storageId: Id<"_storage">;
  fileName: string;
}) {
  const downloadUrl = useQuery(api.documentVersions.getDownloadUrl, {
    storageId,
  });

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!downloadUrl}
      onClick={() => {
        if (downloadUrl) {
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = fileName;
          a.click();
        }
      }}
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Download
    </Button>
  );
}

export function VersionHistory({ documentId }: VersionHistoryProps) {
  const versions = useQuery(api.documentVersions.list, {
    documentId,
  });

  if (versions === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No versions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a file to create the first version.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version, index) => (
        <div
          key={version._id}
          className="flex items-start gap-4 p-4 rounded-lg border bg-card"
        >
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={version.uploader?.imageUrl}
                alt={version.uploader?.name}
              />
              <AvatarFallback className="text-xs">
                {version.uploader?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            {index < versions.length - 1 && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={
                  index === 0 ? "default" : "secondary"
                }
                className="text-xs"
              >
                v{version.versionNumber}
              </Badge>
              <span className="text-sm font-medium">
                {version.uploader?.name ?? "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(
                  version.createdAt
                ).toLocaleDateString()}{" "}
                at{" "}
                {new Date(
                  version.createdAt
                ).toLocaleTimeString()}
              </span>
            </div>

            {version.comment && (
              <p className="text-sm text-muted-foreground mb-2">
                {version.comment}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{version.fileName}</span>
              <span>{formatFileSize(version.fileSize)}</span>
            </div>
          </div>

          <VersionDownloadButton
            storageId={version.storageId}
            fileName={version.fileName}
          />
        </div>
      ))}
    </div>
  );
}
