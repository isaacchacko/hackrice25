// Centralized type definitions for den structures
// This ensures consistency across the entire codebase

export type concept = {
  description: string;
  title: string;
}

export type babyNode = {
  title: string;
  pages: string[];
  conceptList: concept[];
  denned: boolean;
  parent: babyNode | bigDaddyNode;
  children: babyNode[];
  comparisonScore: number;
}

export type bigDaddyNode = {
  query: string;
  pages: string[];
  conceptList: concept[];
  children: babyNode[];
  answer: string;
}

// Interface for API responses that match bigDaddyNode structure
export interface DenMainResponse {
  query: string;
  pages: string[];
  conceptList: concept[];
  children: babyNode[];
  answer: string;
}

// Interface for sendToDen API response
export interface SendToDenResponse {
  success: boolean;
  node?: babyNode | bigDaddyNode;
  concepts_added?: number;
  concepts_removed?: number;
  child_nodes_created?: number;
  error?: string;
}
