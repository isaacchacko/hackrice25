import type { babyNode, bigDaddyNode, SendToDenResponse } from '../types/den.js';
/**
 * Processes a URL by extracting concepts and adding them to a node
 * @param url - The URL to process and extract concepts from
 * @param node - The babyNode or bigDaddyNode to add concepts and URL to
 * @returns Promise containing the updated node or error information
 */
export declare function sendToDen(url: string, node: babyNode | bigDaddyNode): Promise<SendToDenResponse>;
export declare function testSendToDen(): Promise<void>;
//# sourceMappingURL=send_toDen.d.ts.map