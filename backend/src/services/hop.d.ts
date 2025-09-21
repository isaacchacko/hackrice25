import { type Page } from './search.js';
export type HopState = {
    query: string;
    pages: Page[];
    currentIndex: number;
    createdAt: Date;
};
export declare function createHopSession(query: string, sessionId: string): Promise<HopState>;
export declare function getHopSession(sessionId: string): HopState | null;
export declare function navigateHop(sessionId: string, direction: 'next' | 'prev'): HopState | null;
export declare function getCurrentPage(sessionId: string): Page | null;
export declare function getAllPages(sessionId: string): Page[] | null;
export declare function deleteHopSession(sessionId: string): boolean;
export declare function listActiveSessions(): string[];
//# sourceMappingURL=hop.d.ts.map