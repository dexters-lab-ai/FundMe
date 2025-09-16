# FundMe: Technical Implementation Plan

This document outlines the architecture, data models, and phased development plan for the FundMe application.

## 1. System Architecture

The application is architected to separate concerns, ensuring scalability and maintainability.

#### **Data & Logic Flow Diagram**

`
[User: React App] --(1. Audio/Text Input)--> [Frontend Logic]
       |
       |--(2. Shona/Ndebele?)--> [OLLAMA Server: Translate to English]
       |
       '--(3. English Prompt)--> [Convex Action: askAI]
                                     |
                                     '--(4. Call Gemini API w/ findDeals tool)--> [Google Gemini API]
                                                                                      |
                                     <--(5. Gemini executes tool)--------------------'
                                     |
                                     '--(6. Call Convex Query: findDeals)--> [Convex Database]
                                     |
      <--(9. Final UI Data)--- [Convex Action: askAI] <--(7. Gemini gets data, generates summary)-- [Google Gemini API]
                                     |
      <--(8. Return Data)----------'
`

*   **1. Input:** The user provides input via the React frontend (voice is converted to text using the browser's `SpeechRecognition` API).
*   **2. Translation:** If the input is in Shona or Ndebele, the frontend calls a self-hosted OLLAMA service to translate it to English.
*   **3. Convex Action:** The English prompt is sent to a Convex `action` called `askAI`. The user's encrypted Gemini API key is retrieved within this action.
*   **4-7. Gemini Tool Calling:** The `askAI` action calls the Gemini API, providing it with the prompt and a definition for a `findDeals` tool. Gemini intelligently decides when to call this tool, which executes a query against our Convex database.
*   **8-9. Response:** Gemini uses the data from the tool to generate a natural language summary and returns a structured object. Convex relays this back to the frontend, which then animates and renders the `DealCard` components and the AI's summary.

## 2. Phased Development Plan & Goals Checklist

This plan breaks down the project into manageable phases, each with a clear set of goals.

### Phase 1: Core UI, AI Chat & Read-Only Deal Display (Completed)
*   **Goal:** Establish the project foundation with a stunning, high-fidelity UI and basic (English-only) conversational AI using mock data.
*   **Checklist:**
    - [x] Set up React, TypeScript, Tailwind CSS project structure.
    - [x] Implement the main app layout: `Header`, `MainContent`, `Footer`.
    - [x] Create the reactive `AIBlob` 3D visualizer component.
    - [x] Build the `ChatInput` with mic toggle and text input.
    - [x] Design and build the animated `DealCard` component.
    - [x] Use mock data to populate the deal list.
    - [x] Implement temporary AI summary display.
    - [x] Set up basic state management (e.g., Zustand).

### Phase 2: User Authentication & Full Deal Lifecycle (CRUD) (Completed)
*   **Goal:** Enable users to sign up, create their own deals, and search for deals using live AI tool calling.
*   **Checklist:**
    - [x] Integrate Clerk for phone number authentication.
    - [x] Implement Convex schema: `users`, `deals`, `bookmarks`, `fundings`.
    - [x] Develop the "Create Deal" modal and form.
    - [x] Create Convex mutation for creating deals (`deals:create`).
    - [x] Enhance `DealCard` with user-specific controls (e.g., bookmark button).
    - [x] Implement secure storage for user-provided Gemini API keys.
    - [x] Create Convex query for finding deals (`tools:findDeals`).
    - [x] Implement Convex action (`ai:ask`) that uses Gemini with the `findDeals` tool.

### Phase 3: Multilingual Support & OLLAMA Integration
*   **Goal:** Enable the app to understand and process queries in Shona and Ndebele.
*   **Checklist:**
    - [ ] Set up a self-hosted OLLAMA instance.
    - [ ] Train/configure a model for Shona/Ndebele-to-English translation.
    - [ ] Expose the translation model via a REST API.
    - [ ] Implement language detection/selection in the frontend.
    - [ ] Integrate API call to the OLLAMA service before sending prompts to Convex.

### Phase 4: Deal Funding, Payments & KYC
*   **Goal:** Introduce the ability to fund deals, handle transactions, and ensure user trust through KYC.
*   **Checklist:**
    - [ ] Develop the `FundDealModal` component.
    - [ ] Integrate a third-party KYC service SDK/flow.
    - [ ] Update `DealCard` UI to show funding progress and status.
    - [ ] Extend Convex schema: `kycStatus` on `users`.
    - [ ] Implement Convex `httpAction` for handling payment provider webhooks.
    - [ ] Integrate with Ecocash (or other mobile money) API.
    - [ ] Implement logic to update deal status and funding records upon successful payment.

## 3. Convex Backend Specification (`convex/schema.ts`)

This is the planned schema for our Convex database.

```typescript
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
    encryptedGeminiKey: v.optional(v.string()), // Securely stores the user's Gemini API key
  }).index('by_clerk_id', ['clerkId']),

  // Deals created by users
  deals: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    description: v.string(),
    imageUrl: v.string(), // URL to the tilted product photo
    amountTarget: v.number(),
    amountRaised: v.number(),
    deliveryEta: v.string(), // e.g., "by Friday"
    interestRate: v.number(), // e.g., 20 for 20%
    escrow: v.boolean(),
    status: v.union(v.literal('open'), v.literal('funded'), v.literal('completed'), v.literal('cancelled')),
     // Add dealer info directly, as a deal is owned by a user
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
```