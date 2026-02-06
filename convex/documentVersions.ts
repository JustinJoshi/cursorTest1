import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertTeamMember, assertTeamRole } from "./lib/permissions";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const createVersion = mutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const { user } = await assertTeamRole(ctx, doc.teamId, [
      "admin",
      "editor",
    ]);

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_documentId", (q) =>
        q.eq("documentId", args.documentId)
      )
      .collect();

    const maxVersion = versions.reduce(
      (max, v) => Math.max(max, v.versionNumber),
      0
    );

    const versionId = await ctx.db.insert("documentVersions", {
      documentId: args.documentId,
      storageId: args.storageId,
      versionNumber: maxVersion + 1,
      uploadedBy: user._id,
      comment: args.comment,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.documentId, {
      updatedAt: Date.now(),
    });

    return versionId;
  },
});

export const list = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    await assertTeamMember(ctx, doc.teamId);

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_documentId", (q) =>
        q.eq("documentId", args.documentId)
      )
      .collect();

    versions.sort((a, b) => b.versionNumber - a.versionNumber);

    return Promise.all(
      versions.map(async (ver) => {
        const uploader = await ctx.db.get(ver.uploadedBy);
        return { ...ver, uploader };
      })
    );
  },
});

export const getDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
