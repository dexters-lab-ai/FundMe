import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/clerk-sdk-node";
import { internal } from "./_generated/api";

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request);
  if (!event) {
    return new Response("Invalid request", { status: 400 });
  }
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, first_name, last_name, image_url, phone_numbers } = event.data;
      await ctx.runMutation(internal.users.createOrUpdateUser, {
        clerkId: id,
        name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
        profileUrl: image_url,
        phone: phone_numbers?.[0]?.phone_number,
      });
      break;
    }
    default: {
      console.log("Unhandled Clerk webhook event:", event.type);
    }
  }
  return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

async function validateRequest(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set in environment variables.");
  }

  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  
  const wh = new Webhook(webhookSecret);
  try {
    return wh.verify(payloadString, svixHeaders) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying Clerk webhook:", error);
    return null;
  }
}

export default http;
