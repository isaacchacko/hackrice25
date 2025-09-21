import type { bigDaddyNode, babyNode } from '../types/den.js';
export declare function clearCentralBigDaddyNode(): void;
export declare function clearAllMemory(): void;
export declare function resetCentralNodeForNewSearch(query: string, pages: Page[]): Promise<bigDaddyNode>;
export declare function getCentralBigDaddyNode(): bigDaddyNode | null;
export declare function setCentralBigDaddyNode(node: bigDaddyNode | null): void;
export declare function getCurrentHopSession(): string | null;
export declare function setCurrentHopSession(sessionId: string | null): void;
export declare function getCurrentFocusNode(): bigDaddyNode | null;
export declare function setCurrentFocusNode(node: bigDaddyNode | null): void;
export declare function updateCentralNodeFromFocusNode(): void;
export declare function createCentralBigDaddyNode(query: string, pages: Page[]): Promise<bigDaddyNode>;
export declare function getOrCreateCentralBigDaddyNode(query: string, pages: Page[]): Promise<bigDaddyNode>;
export type Page = {
    url: string;
    title?: string;
    snippet?: string;
};
export type SearchOptions = {
    limit?: number;
    lang?: string;
    safe?: "off" | "active";
    site?: string[];
};
export declare function search(query: string, opts?: SearchOptions): Promise<Page[]>;
export declare function searchWithCentralNode(query: string, opts?: SearchOptions): Promise<{
    pages: Page[];
    centralNode: bigDaddyNode;
    hopSessionId: string;
}>;
/**
 * Burrows into a child node by setting it as a den and adding new child concepts
 * @param centralNode - The central bigDaddyNode containing the child to burrow into
 * @param childTitle - The title of the child node to burrow into
 * @returns Promise containing the updated central node or error information
 */
export declare function burrowIntoChildNode(centralNode: bigDaddyNode, childTitle: string): Promise<{
    success: boolean;
    centralNode?: bigDaddyNode;
    childNode?: babyNode;
    newChildrenCount?: number;
    error?: string;
}>;
//# sourceMappingURL=search.d.ts.map