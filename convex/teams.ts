import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getCurrentUser,
  assertTeamMember,
  assertTeamRole,
} from "./lib/permissions";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user._id,
      role: "admin",
      joinedAt: Date.now(),
    });

    return teamId;
  },
});

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team) return null;
        return { ...team, role: m.role };
      })
    );

    return teams.filter(
      (t): t is NonNullable<typeof t> => t !== null
    );
  },
});

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { member } = await assertTeamMember(ctx, args.teamId);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    return { ...team, role: member.role };
  },
});

export const getMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamMember(ctx, args.teamId);

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    return Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      })
    );
  },
});

export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await assertTeamRole(ctx, args.teamId, ["admin"]);

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (targetUser) {
      // User already has an account — add them directly
      const existingMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_userId", (q) =>
          q.eq("teamId", args.teamId).eq("userId", targetUser._id)
        )
        .unique();

      if (existingMember) {
        throw new Error("User is already a member of this team");
      }

      await ctx.db.insert("teamMembers", {
        teamId: args.teamId,
        userId: targetUser._id,
        role: args.role,
        joinedAt: Date.now(),
      });

      return "added" as const;
    }

    // User doesn't exist yet — create a pending invite
    const existingInvites = await ctx.db
      .query("invites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", args.email).eq("status", "pending")
      )
      .collect();

    const duplicateInvite = existingInvites.find(
      (i) => i.teamId === args.teamId
    );

    if (duplicateInvite) {
      throw new Error("An invite has already been sent to this email");
    }

    await ctx.db.insert("invites", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });

    // Schedule invite email
    const team = await ctx.db.get(args.teamId);
    await ctx.scheduler.runAfter(0, internal.email.sendInviteEmail, {
      email: args.email,
      teamName: team?.name ?? "Unknown Team",
      invitedByName: user.name,
      role: args.role,
    });

    return "invited" as const;
  },
});

export const updateMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("teamMembers"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    await assertTeamRole(ctx, args.teamId, ["admin"]);

    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    await assertTeamRole(ctx, args.teamId, ["admin"]);

    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId) {
      throw new Error("Member not found");
    }

    const team = await ctx.db.get(args.teamId);
    if (team && member.userId === team.createdBy) {
      throw new Error("Cannot remove the team creator");
    }

    await ctx.db.delete(args.memberId);
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { user } = await assertTeamRole(ctx, args.teamId, ["admin"]);

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.createdBy !== user._id) {
      throw new Error("Only the team creator can delete the team");
    }

    // Delete all team members
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all pending invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete all documents and their versions
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const doc of documents) {
      const versions = await ctx.db
        .query("documentVersions")
        .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
        .collect();
      for (const version of versions) {
        await ctx.storage.delete(version.storageId);
        await ctx.db.delete(version._id);
      }
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.teamId);
  },
});
