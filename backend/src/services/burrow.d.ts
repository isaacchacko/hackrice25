import { type Page } from './search.js';
export type BurrowOptions = {
    limit?: number;
    lang?: string;
    safe?: "off" | "active";
    site?: string[];
};
/**
 * Burrows deeper into a concept by searching for "what is [concept]"
 * @param concept - The concept to burrow into (1-2 words)
 * @param opts - Search options for the burrow operation
 * @returns Promise containing the pages found for the concept
 */
export declare function burrow(concept: string, opts?: BurrowOptions): Promise<Page[]>;
export declare function testBurrow(): Promise<void>;
//# sourceMappingURL=burrow.d.ts.map