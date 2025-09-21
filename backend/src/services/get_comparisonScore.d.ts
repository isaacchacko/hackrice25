interface ComparisonScoreResponse {
    success: boolean;
    score?: number;
    error?: string;
}
/**
 * Calculates a similarity score between two strings using Gemini AI
 * @param string1 - First string to compare
 * @param string2 - Second string to compare
 * @returns Promise containing similarity score (0-100) or error information
 */
export declare function get_comparisonScore(string1: string, string2: string): Promise<ComparisonScoreResponse>;
export declare function testGetComparisonScore(): Promise<void>;
export {};
//# sourceMappingURL=get_comparisonScore.d.ts.map