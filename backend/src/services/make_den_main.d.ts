import type { DenMainResponse } from '../types/den.js';
/**
 * Creates a den main response with the given query and empty arrays for pages, concepts, and children
 * @param query - The search query string
 * @returns Promise containing the den main response structure
 */
export declare function make_den_main(query: string): Promise<DenMainResponse>;
export declare function testMakeDenMain(): Promise<void>;
//# sourceMappingURL=make_den_main.d.ts.map