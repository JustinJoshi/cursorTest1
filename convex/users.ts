import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called from the client to ensure the authenticated user exists in the DB.
// This is a safety net so we don't rely solely on the Clerk webhook.
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      // Update with latest info from Clerk
      await ctx.db.patch(existingUser._id, {
        email: identity.email ?? existingUser.email,
        name: identity.name ?? existingUser.name,
        imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.email ?? "Unknown",
      imageUrl: identity.pictureUrl,
    });

    // Auto-accept any pending invites for this email
    const email = identity.email ?? "";
    if (email) {
      const pendingInvites = await ctx.db
        .query("invites")
        .withIndex("by_email_status", (q) =>
          q.eq("email", email).eq("status", "pending")
        )
        .collect();

      for (const invite of pendingInvites) {
        await ctx.db.insert("teamMembers", {
          teamId: invite.teamId,
          userId,
          role: invite.role,
          joinedAt: Date.now(),
        });
        await ctx.db.patch(invite._id, { status: "accepted" });
      }
    }

    return userId;
  },
});

export const getOrCreateUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });

    // Auto-accept any pending invites for this email
    if (args.email) {
      const pendingInvites = await ctx.db
        .query("invites")
        .withIndex("by_email_status", (q) =>
          q.eq("email", args.email).eq("status", "pending")
        )
        .collect();

      for (const invite of pendingInvites) {
        await ctx.db.insert("teamMembers", {
          teamId: invite.teamId,
          userId,
          role: invite.role,
          joinedAt: Date.now(),
        });
        await ctx.db.patch(invite._id, { status: "accepted" });
      }
    }

    return userId;
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const currentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
