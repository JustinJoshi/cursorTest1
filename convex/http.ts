import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    const svixId = request.headers.get("svix-id");
    const svixSignature = request.headers.get("svix-signature");
    const svixTimestamp = request.headers.get("svix-timestamp");

    if (!svixId || !svixSignature || !svixTimestamp) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);

    let evt: {
      type: string;
      data: {
        id: string;
        email_addresses: { email_address: string }[];
        first_name?: string;
        last_name?: string;
        image_url?: string;
      };
    };

    try {
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-signature": svixSignature,
        "svix-timestamp": svixTimestamp,
      }) as typeof evt;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error verifying webhook", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name =
        [first_name, last_name].filter(Boolean).join(" ") || email;

      await ctx.runMutation(internal.users.getOrCreateUser, {
        clerkId: id,
        email,
        name,
        imageUrl: image_url,
      });
    }

    if (eventType === "user.deleted") {
      await ctx.runMutation(internal.users.deleteUser, {
        clerkId: evt.data.id,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
