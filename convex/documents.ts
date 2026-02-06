import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertTeamMember,
  assertTeamRole,
} from "./lib/permissions";

export const create = mutation({
  args: {
    name: v.string(),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const { user } = await assertTeamRole(ctx, args.teamId, [
      "admin",
      "editor",
    ]);

    return await ctx.db.insert("documents", {
      name: args.name,
      teamId: args.teamId,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const list = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamMember(ctx, args.teamId);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    return Promise.all(
      documents.map(async (doc) => {
        const creator = await ctx.db.get(doc.createdBy);
        const versions = await ctx.db
          .query("documentVersions")
          .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
          .collect();
        const latestVersion = versions.sort(
          (a, b) => b.versionNumber - a.versionNumber
        )[0];

        return {
          ...doc,
          creator,
          latestVersion: latestVersion ?? null,
          versionCount: versions.length,
        };
      })
    );
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const { member } = await assertTeamMember(ctx, doc.teamId);
    const creator = await ctx.db.get(doc.createdBy);

    return { ...doc, creator, role: member.role };
  },
});

export const rename = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    await assertTeamRole(ctx, doc.teamId, ["admin", "editor"]);

    await ctx.db.patch(args.documentId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    await assertTeamRole(ctx, doc.teamId, ["admin"]);

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const version of versions) {
      await ctx.storage.delete(version.storageId);
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(args.documentId);
  },
});
