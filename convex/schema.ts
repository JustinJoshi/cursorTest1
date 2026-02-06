import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  teams: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    joinedAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_userId", ["userId"])
    .index("by_teamId_userId", ["teamId", "userId"]),

  documents: defineTable({
    name: v.string(),
    teamId: v.id("teams"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),

  documentVersions: defineTable({
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    versionNumber: v.number(),
    uploadedBy: v.id("users"),
    comment: v.optional(v.string()),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    createdAt: v.number(),
  }).index("by_documentId", ["documentId"]),
});
