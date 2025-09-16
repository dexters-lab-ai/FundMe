import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Regular mutation to sync a user
export const syncCurrentUser = mutation({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }
        
        // Only allow users to sync their own account
        if (identity.subject !== args.clerkId) {
            throw new Error("Unauthorized: You can only sync your own account");
        }
        
        console.log("Syncing user with clerkId:", args.clerkId);

        // Check if user exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existingUser) {
            console.log("User already exists:", existingUser._id);
            return existingUser._id;
        }

        // Create new user
        const now = Date.now();
        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            name: identity.name || "Unknown User",
            profileUrl: identity.pictureUrl || "",
            kycStatus: "not_started",
            encryptedGeminiKey: "",
            createdAt: now,
            updatedAt: now,
        });

        console.log("Created new user:", userId);
        return userId;
    },
});
