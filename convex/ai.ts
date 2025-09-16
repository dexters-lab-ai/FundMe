import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { GoogleGenAI, Type } from "@google/genai";
import { Id } from "./_generated/dataModel";

// Define the response type for the generateContent API
type GenerateContentResponse = {
  text: () => string;
  // Add other properties as needed
};

type GenerateContentResult = {
  response: GenerateContentResponse;
  // Add other properties as needed
};

// Define types for our data models
type User = {
  _id: Id<"users">;
  encryptedGeminiKey: string;
  // Add other user fields as needed
};

type Deal = {
  _id: Id<"deals">;
  name: string;
  description: string;
  interestRate: number;
  amountTarget: number;
  // Add other deal fields as needed
};

// Define the schema for the findDeals tool
const findDealsSchema = {
  name: "findDeals",
  description: "Finds financing deals based on a user's search query. Use this to find deals related to specific products, categories, or timelines (e.g., 'deals for fish supply', 'deals that deliver by Friday').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      searchQuery: {
        type: Type.STRING,
        description: "The user's query to search for deals, such as 'bakery supply' or 'quick cash'."
      },
    },
    required: ["searchQuery"],
  },
};

export const ask = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx: ActionCtx, { prompt }: { prompt: string }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to ask a question.");
    }

    const user = await ctx.runQuery(api.users.getCurrent) as User | null;
    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.encryptedGeminiKey) {
      throw new Error("You must have a Gemini API key saved in your settings to use the AI search.");
    }

    const ai = new GoogleGenAI({ apiKey: user.encryptedGeminiKey });

    const tools = [{ functionDeclarations: [findDealsSchema] }];

    // Fix: The 'tools' parameter must be placed inside a 'config' object.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: tools,
      },
    });
    
    const call = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (call) {
      if (call.name === "findDeals") {
        if (!call.args || typeof call.args !== 'object' || !('searchQuery' in call.args)) {
          throw new Error('Invalid arguments for findDeals function');
        }
        const { searchQuery } = call.args as { searchQuery: string };
        console.log(`AI is searching for deals with query: "${searchQuery}"`);
        
        // Execute the tool (our Convex query)
        const deals = await ctx.runQuery(api.deals.find, { searchQuery }) as Deal[];
        
        // Send the tool's result back to the model to get a summary
        // Fix: The 'tools' parameter must be placed inside a 'config' object.
        const followUpResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: "user", parts: [{ text: prompt }] },
                { role: "model", parts: [{ functionCall: call }] },
                { 
                    role: "function", 
                    parts: [{ 
                        functionResponse: {
                            name: "findDeals",
                            response: {
                                deals: deals.map(d => ({ name: d.name, description: d.description, interest: d.interestRate, target: d.amountTarget })),
                            }
                        }
                    }]
                }
            ],
            config: {
              tools: tools,
            },
        });
        
        const summary = (followUpResponse as unknown as GenerateContentResult).response.text();
        return { summary, deals };
      }
    }

    // If no tool was called, return the direct text response.
    const text = (response as unknown as GenerateContentResult).response.text();
    return { 
      summary: text,
      deals: [] as Deal[] 
    };
  },
});