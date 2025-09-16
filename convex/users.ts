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
        try {
            console.log('createOrUpdateUser called with:', args);
            
            const user = await ctx.db
                .query('users')
                .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
                .unique();

            if (user === null) {
                console.log('Creating new user with clerkId:', args.clerkId);
                // Create a new user
                const now = Date.now();
                const userId = await ctx.db.insert('users', {
                    clerkId: args.clerkId,
                    name: args.name,
                    profileUrl: args.profileUrl,
                    phone: args.phone,
                    kycStatus: 'not_started',
                    encryptedGeminiKey: '', // Initialize with empty string
                    createdAt: now,
                    updatedAt: now
                });
                console.log('Created user with ID:', userId);
                return userId;
            } else {
                console.log('Updating existing user:', user._id);
                // Update an existing user
                await ctx.db.patch(user._id, {
                    name: args.name,
                    profileUrl: args.profileUrl,
                    phone: args.phone,
                    updatedAt: Date.now()
                });
                return user._id;
            }
        } catch (error) {
            console.error('Error in createOrUpdateUser:', error);
            throw error;
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
        console.log('storeApiKey called');
        
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("You must be logged in to store an API key.");
        }

        console.log('User identity:', identity);

        // Look up the user by their Clerk ID
        console.log('Looking up user with clerkId:', identity.subject);
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const now = Date.now();
        
        if (!user) {
            console.log('User not found, creating new user...');
            // Create a new user if not found
            await ctx.db.insert("users", {
                clerkId: identity.subject,
                name: identity.name || "",
                email: identity.email || "",
                profileUrl: identity.pictureUrl || "",
                kycStatus: "not_started",
                encryptedGeminiKey: args.apiKey,
                createdAt: now,
                updatedAt: now
            });
            console.log('Created new user');
            return { success: true };
        }

        // Update the user's API key and other fields
        console.log('Updating API key for user:', user._id);
        await ctx.db.patch(user._id, { 
            encryptedGeminiKey: args.apiKey,
            updatedAt: now,
            // Update other fields that might have changed
            name: identity.name || user.name,
            profileUrl: identity.pictureUrl || user.profileUrl,
            email: identity.email || user.email || ""
        });
        
        console.log('API key updated successfully');
        return { success: true };
    }
});