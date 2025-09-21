interface Concept {
    title: string;
    description: string;
}
interface GetAnswerResponse {
    success: boolean;
    answer?: string;
    shortAnswer?: string[];
    error?: string;
}
/**
 * Answers a question using multiple URLs as sources and provided concepts
 * @param urls - Array of URLs to use as sources
 * @param concepts - Array of relevant concepts to consider
 * @param question - The question to answer
 * @returns Promise containing the answer and sources used or error information
 */
export declare function get_answer(urls: string[], concepts: Concept[], question: string): Promise<GetAnswerResponse>;
export declare function testGetAnswer(): Promise<void>;
export {};
//# sourceMappingURL=get_answer.d.ts.map