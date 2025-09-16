import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all bookmarks for the current user
export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // Return empty array if not logged in
            return [];
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            return [];
        }

        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_deal", (q) => q.eq("userId", user._id))
            .collect();
            
        return bookmarks;
    },
});

// Toggle a bookmark for a deal
export const toggle = mutation({
    args: {
        dealId: v.id("deals"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("You must be logged in to bookmark a deal.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found.");
        }

        // Check if the bookmark already exists
        const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_deal", (q) => 
                q.eq("userId", user._id).eq("dealId", args.dealId)
            )
            .unique();

        if (existingBookmark) {
            // If it exists, delete it
            await ctx.db.delete(existingBookmark._id);
            return { action: "deleted" };
        } else {
            // If it doesn't exist, create it
            await ctx.db.insert("bookmarks", {
                userId: user._id,
                dealId: args.dealId,
            });
            return { action: "created" };
        }
    },
});