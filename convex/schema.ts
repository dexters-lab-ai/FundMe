import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Users table, synced with Clerk
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()), // Phone might not always be available
    profileUrl: v.optional(v.string()),
    kycStatus: v.union(
        v.literal('not_started'), 
        v.literal('pending'), 
        v.literal('verified'), 
        v.literal('rejected')
    ),
    encryptedGeminiKey: v.optional(v.string()),
  }).index('by_clerk_id', ['clerkId']),

  // Deals created by users
  deals: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    description: v.string(),
    imageUrl: v.string(),
    amountTarget: v.number(),
    amountRaised: v.number(),
    deliveryEta: v.string(),
    interestRate: v.number(),
    escrow: v.boolean(),
    status: v.union(v.literal('open'), v.literal('funded'), v.literal('completed'), v.literal('cancelled')),
    dealerName: v.string(),
    dealerRating: v.number(),
    searchableText: v.string(),
  })
  .index('by_ownerId', ['ownerId'])
  .searchIndex('by_search', {
      searchField: 'searchableText',
      filterFields: ['dealerName'],
  }),

  // Records of who funded which deal
  fundings: defineTable({
    funderId: v.id('users'),
    dealId: v.id('deals'),
    amount: v.number(),
    fundedAt: v.number(), // timestamp
  })
    .index('by_dealId', ['dealId'])
    .index('by_funderId', ['funderId']),

  // User bookmarks
  bookmarks: defineTable({
    userId: v.id('users'),
    dealId: v.id('deals'),
  })
    .index('by_user_deal', ['userId', 'dealId']),
});