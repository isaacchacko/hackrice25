interface Concept {
    title: string;
    description: string;
}
interface GetConceptsResponse {
    success: boolean;
    concepts?: Concept[];
    error?: string;
}
/**
 * Extracts the top 3 concepts from a webpage using Gemini AI
 * @param link - The URL of the webpage to analyze
 * @returns Promise containing the top 3 concepts or error information
 */
export declare function get_concepts(link: string): Promise<GetConceptsResponse>;
export declare function testGetConcepts(): Promise<void>;
export {};
//# sourceMappingURL=get_concepts.d.ts.map