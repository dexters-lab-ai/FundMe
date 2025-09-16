/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Id } from "./convex/_generated/dataModel";

/**
 * Defines the complete client-side structure for a financing deal.
 * This should match the schema defined in convex/schema.ts
 */
export interface Deal {
  // System fields
  _id: Id<"deals">;
  _creationTime: number;
  
  // Required fields from schema
  ownerId: Id<"users">;
  name: string;
  description: string;
  imageUrl: string;
  amountTarget: number;
  amountRaised: number;
  deliveryEta: string;
  interestRate: number;
  escrow: boolean;
  status: 'open' | 'funded' | 'completed' | 'cancelled';
  dealerName: string;
  dealerRating: number;
  searchableText: string;
  
  // Allow additional properties
  [key: string]: any;
}

/**
 * Type guard to check if an object is a valid Deal
 */
export function isDeal(obj: any): obj is Deal {
  return (
    obj &&
    typeof obj === 'object' &&
    '_id' in obj &&
    '_creationTime' in obj &&
    'ownerId' in obj &&
    'name' in obj &&
    'description' in obj &&
    'imageUrl' in obj &&
    'amountTarget' in obj &&
    'amountRaised' in obj &&
    'deliveryEta' in obj &&
    'interestRate' in obj &&
    'escrow' in obj &&
    'status' in obj &&
    'dealerName' in obj &&
    'dealerRating' in obj &&
    'searchableText' in obj
  );
}

/**
 * Creates a new Deal object with default values
 */
export function createDeal(partial: Partial<Deal> = {}): Deal {
  return {
    _id: partial._id || '' as Id<"deals">,
    _creationTime: partial._creationTime || Date.now(),
    ownerId: partial.ownerId || '' as Id<"users">,
    name: partial.name || '',
    description: partial.description || '',
    imageUrl: partial.imageUrl || '',
    amountTarget: partial.amountTarget || 0,
    amountRaised: partial.amountRaised || 0,
    deliveryEta: partial.deliveryEta || '',
    interestRate: partial.interestRate || 0,
    escrow: Boolean(partial.escrow),
    status: (partial.status as Deal['status']) || 'open',
    dealerName: partial.dealerName || '',
    dealerRating: partial.dealerRating || 0,
    searchableText: partial.searchableText || '',
    ...partial
  };
}
