import { get_concepts } from './get_concepts.js';
import { simplify_concepts } from './simplify_concepts.js';

type concept = {
  description: string;
  title: string;
}

type babyNode = {
  title: string;
  pages: string[];
  conceptList: concept[];
  denned: boolean;
  parent: babyNode | bigDaddyNode;
  children: babyNode[];
}

type bigDaddyNode = {
  query: string;
  pages: string[];
  conceptList: concept[]
  children: babyNode[]
}

interface SendToDenResponse {
  success: boolean;
  node?: babyNode | bigDaddyNode;
  concepts_added?: number;
  concepts_removed?: number;
  error?: string;
}

/**
 * Processes a URL by extracting concepts and adding them to a node
 * @param url - The URL to process and extract concepts from
 * @param node - The babyNode or bigDaddyNode to add concepts and URL to
 * @returns Promise containing the updated node or error information
 */
export async function sendToDen(
  url: string, 
  node: babyNode | bigDaddyNode
): Promise<SendToDenResponse> {
  try {
    // Validate inputs
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid or empty URL provided'
      };
    }

    if (!node || typeof node !== 'object') {
      return {
        success: false,
        error: 'Invalid node provided'
      };
    }

    // Check if URL is already in the pages list
    if (node.pages.includes(url)) {
      return {
        success: true,
        node: node,
        concepts_added: 0,
        concepts_removed: 0
      };
    }

    // Extract concepts from the URL
    console.log(`Extracting concepts from: ${url}`);
    const conceptsResult = await get_concepts(url);

    if (!conceptsResult.success || !conceptsResult.concepts) {
      return {
        success: false,
        error: `Failed to extract concepts from URL: ${conceptsResult.error}`
      };
    }

    // Store original concept count for tracking
    const originalConceptCount = node.conceptList.length;

    // Add new concepts to the node's conceptList
    const newConcepts = conceptsResult.concepts;
    node.conceptList.push(...newConcepts);
    
    console.log(`Added ${newConcepts.length} new concepts to node`);

    // Simplify the conceptList to remove duplicates
    console.log('Simplifying concept list...');
    const simplifyResult = await simplify_concepts(node.conceptList);

    if (!simplifyResult.success || !simplifyResult.concepts) {
      return {
        success: false,
        error: `Failed to simplify concepts: ${simplifyResult.error}`
      };
    }

    // Update the node's conceptList with simplified concepts
    node.conceptList = simplifyResult.concepts;
    
    // Add the URL to the node's pages list
    node.pages.push(url);

    // Calculate statistics
    const conceptsAdded = newConcepts.length;
    const conceptsRemoved = simplifyResult.removed_count || 0;
    const finalConceptCount = node.conceptList.length;

    console.log(`Concepts added: ${conceptsAdded}`);
    console.log(`Concepts removed during simplification: ${conceptsRemoved}`);
    console.log(`Final concept count: ${finalConceptCount}`);

    return {
      success: true,
      node: node,
      concepts_added: conceptsAdded,
      concepts_removed: conceptsRemoved
    };

  } catch (error) {
    console.error('Error in sendToDen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Example usage function (for testing)
export async function testSendToDen() {
  // Create a test bigDaddyNode
  const testNode: bigDaddyNode = {
    query: "artificial intelligence",
    pages: [],
    conceptList: [
      {
        title: "Machine Learning",
        description: "A subset of AI that enables computers to learn without being explicitly programmed."
      }
    ],
    children: []
  };

  console.log('Testing sendToDen function...');
  console.log('Initial concept count:', testNode.conceptList.length);
  console.log('Initial pages count:', testNode.pages.length);

  const result = await sendToDen('https://en.wikipedia.org/wiki/Artificial_intelligence', testNode);
  
  if (result.success) {
    console.log('✅ Success!');
    console.log('Final concept count:', testNode.conceptList.length);
    console.log('Final pages count:', testNode.pages.length);
    console.log('Concepts added:', result.concepts_added);
    console.log('Concepts removed:', result.concepts_removed);
  } else {
    console.log('❌ Error:', result.error);
  }
}