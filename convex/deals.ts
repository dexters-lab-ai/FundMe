import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Public query to list all deals
export const list = query({
  args: {},
  handler: async (ctx) => {
    const deals = await ctx.db.query("deals").order("desc").collect();
    return deals;
  },
});

// Query to find deals using search
export const find = query({
    args: { searchQuery: v.string() },
    handler: async (ctx, args) => {
      // If search query is empty, it makes more sense to return all deals
      // or handle it as a specific case, rather than throwing an error.
      if (args.searchQuery === "") {
        return await ctx.db.query("deals").order("desc").collect();
      }
      
      const deals = await ctx.db
        .query("deals")
        .withSearchIndex("by_search", (q) => 
            q.search("searchableText", args.searchQuery)
        )
        .collect();
      
      return deals;
    },
  });

// Authenticated mutation to create a new deal
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        imageUrl: v.string(),
        amountTarget: v.number(),
        deliveryEta: v.string(),
        interestRate: v.number(),
        escrow: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("You must be logged in to create a deal.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found.");
        }

        const searchableText = `${args.name} ${args.description} ${user.name}`;

        const dealId = await ctx.db.insert("deals", {
            ownerId: user._id,
            name: args.name,
            description: args.description,
            imageUrl: args.imageUrl,
            amountTarget: args.amountTarget,
            deliveryEta: args.deliveryEta,
            interestRate: args.interestRate,
            escrow: args.escrow,
            amountRaised: 0,
            status: "open",
            dealerName: user.name, // Use the creator's name as the dealer name
            dealerRating: 5.0, // Default to a 5-star rating for now
            searchableText: searchableText,
        });

        return dealId;
    }
});