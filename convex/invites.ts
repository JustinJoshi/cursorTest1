import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertTeamMember, assertTeamRole } from "./lib/permissions";

export const listPending = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamMember(ctx, args.teamId);

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Filter to pending only and enrich with inviter info
    const pendingInvites = invites.filter((i) => i.status === "pending");

    return Promise.all(
      pendingInvites.map(async (invite) => {
        const inviter = await ctx.db.get(invite.invitedBy);
        return { ...invite, invitedByName: inviter?.name ?? "Unknown" };
      })
    );
  },
});

export const cancel = mutation({
  args: {
    teamId: v.id("teams"),
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    await assertTeamRole(ctx, args.teamId, ["admin"]);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.teamId !== args.teamId) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }

    await ctx.db.patch(args.inviteId, { status: "cancelled" });
  },
});
