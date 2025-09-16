import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createOrUpdateUser = internalMutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        profileUrl: v.optional(v.string()),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
            .unique();

        if (user === null) {
            // Create a new user
            await ctx.db.insert('users', {
                clerkId: args.clerkId,
                name: args.name,
                profileUrl: args.profileUrl,
                phone: args.phone,
                kycStatus: 'not_started',
            });
        } else {
            // Update an existing user
            await ctx.db.patch(user._id, {
                name: args.name,
                profileUrl: args.profileUrl,
                phone: args.phone,
            });
        }
    }
});

// Query to get the current logged-in user
export const getCurrent = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null; // Not logged in
        }
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();
        
        return user;
    }
});

// Mutation to store the Gemini API key
export const storeApiKey = mutation({
    args: { apiKey: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("You must be logged in to store an API key.");
        }
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found.");
        }
        // In a real production app, this key should be encrypted before storing.
        await ctx.db.patch(user._id, { encryptedGeminiKey: args.apiKey });
    }
});