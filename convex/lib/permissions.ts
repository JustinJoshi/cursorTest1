import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type Role = "admin" | "editor" | "viewer";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found in database. Please wait a moment and try again.");
  }

  return user;
}

export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function getTeamMember(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", userId)
    )
    .unique();
}

export async function assertTeamMember(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
) {
  const user = await getCurrentUser(ctx);
  const member = await getTeamMember(ctx, teamId, user._id);

  if (!member) {
    throw new Error("You are not a member of this team");
  }

  return { user, member };
}

export async function assertTeamRole(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  requiredRoles: Role[]
) {
  const { user, member } = await assertTeamMember(ctx, teamId);

  if (!requiredRoles.includes(member.role)) {
    throw new Error(
      `Requires one of: ${requiredRoles.join(", ")}. You have: ${member.role}`
    );
  }

  return { user, member };
}
