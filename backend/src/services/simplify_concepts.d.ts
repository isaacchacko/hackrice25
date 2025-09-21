interface Concept {
    title: string;
    description: string;
}
interface SimplifyConceptsResponse {
    success: boolean;
    concepts?: Concept[];
    removed_count?: number;
    error?: string;
}
/**
 * Removes duplicate and similar concepts from a list of concepts using Gemini AI
 * @param concepts - Array of concepts to deduplicate
 * @returns Promise containing deduplicated concepts or error information
 */
export declare function simplify_concepts(concepts: Concept[]): Promise<SimplifyConceptsResponse>;
export declare function testSimplifyConcepts(): Promise<void>;
export {};
//# sourceMappingURL=simplify_concepts.d.ts.map