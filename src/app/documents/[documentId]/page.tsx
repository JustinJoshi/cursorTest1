"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { VersionHistory } from "@/components/version-history";
import { UploadDialog } from "@/components/upload-dialog";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileUp, FileText, User, Calendar } from "lucide-react";
import Link from "next/link";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const document = useQuery(api.documents.get, {
    documentId: documentId as Id<"documents">,
  });

  const [showUpload, setShowUpload] = useState(false);

  if (document === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const canEdit =
    document.role === "admin" || document.role === "editor";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/teams/${document.teamId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">
              {document.name}
            </h1>
            <RoleBadge role={document.role} />
          </div>
        </div>
        {canEdit && (
          <UploadDialog
            teamId={document.teamId}
            documentId={documentId as Id<"documents">}
            open={showUpload}
            onOpenChange={setShowUpload}
          >
            <Button>
              <FileUp className="h-4 w-4 mr-2" />
              Upload New Version
            </Button>
          </UploadDialog>
        )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">
            Document Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">
                  Created by
                </p>
                <p className="font-medium">
                  {document.creator?.name ?? "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">
                  Created
                </p>
                <p className="font-medium">
                  {new Date(
                    document.createdAt
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">
                  Last updated
                </p>
                <p className="font-medium">
                  {new Date(
                    document.updatedAt
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Version History
        </h2>
        <VersionHistory
          documentId={documentId as Id<"documents">}
        />
      </div>
    </div>
  );
}
