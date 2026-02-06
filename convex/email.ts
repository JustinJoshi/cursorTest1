"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const sendInviteEmail = internalAction({
  args: {
    email: v.string(),
    teamName: v.string(),
    invitedByName: v.string(),
    role: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY not set — skipping invite email to",
        args.email
      );
      return;
    }

    const resend = new Resend(apiKey);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "DocVault <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromEmail,
      to: args.email,
      subject: `You've been invited to join ${args.teamName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>You're invited!</h2>
          <p>
            <strong>${args.invitedByName}</strong> has invited you to join
            <strong>${args.teamName}</strong> as a <strong>${args.role}</strong>.
          </p>
          <p>
            Sign up or log in to get started:
          </p>
          <a
            href="${appUrl}/sign-up"
            style="display: inline-block; padding: 12px 24px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 6px;"
          >
            Get Started
          </a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            If you already have an account, simply
            <a href="${appUrl}/sign-in">sign in</a> and you'll be
            automatically added to the team.
          </p>
        </div>
      `,
    });
  },
});
