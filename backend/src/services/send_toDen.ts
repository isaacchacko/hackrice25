import { get_concepts } from './get_concepts.js';
import { simplify_concepts } from './simplify_concepts.js';
import { get_comparisonScore } from './get_comparisonScore.js';
import type { concept, babyNode, bigDaddyNode, SendToDenResponse } from '../types/den.js';

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

    // Create child nodes for each new concept
    console.log('Creating child nodes for new concepts...');
    const newChildNodes: babyNode[] = [];
    
    for (const concept of newConcepts) {
      // Calculate comparison score between concept title and parent node query/title
      let comparisonScore = 0;
      try {
        const parentQuery = 'query' in node ? node.query : node.title;
        console.log(`Calculating comparison score for "${concept.title}" vs "${parentQuery}"`);
        
        const scoreResult = await get_comparisonScore(concept.title, parentQuery);
        if (scoreResult.success && typeof scoreResult.score === 'number') {
          comparisonScore = scoreResult.score;
          console.log(`Comparison score: ${comparisonScore}/100`);
        } else {
          console.warn(`Failed to calculate comparison score: ${scoreResult.error}`);
          comparisonScore = 0; // Default to 0 if calculation fails
        }
      } catch (error) {
        console.error(`Error calculating comparison score for "${concept.title}":`, error);
        comparisonScore = 0; // Default to 0 if calculation fails
      }

      const childNode: babyNode = {
        title: concept.title,  // Short part of the concept
        pages: [url],         // Page that was passed into the function
        conceptList: [concept], // The whole concept stored in conceptList
        denned: false,        // Always false for new child nodes
        parent: node,         // Parent is the node passed into the function
        children: [],         // Empty children list
        comparisonScore: comparisonScore // Comparison score with parent
      };
      
      newChildNodes.push(childNode);
      console.log(`Created child node for concept: "${concept.title}" with comparison score: ${comparisonScore}`);
    }

    // Add new child nodes to the parent node's children array
    if ('children' in node) {
      node.children.push(...newChildNodes);
      console.log(`Added ${newChildNodes.length} child nodes to parent`);
    }

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
    const childNodesCreated = newChildNodes.length;
    const finalConceptCount = node.conceptList.length;

    console.log(`Concepts added: ${conceptsAdded}`);
    console.log(`Concepts removed during simplification: ${conceptsRemoved}`);
    console.log(`Child nodes created: ${childNodesCreated}`);
    console.log(`Final concept count: ${finalConceptCount}`);

    return {
      success: true,
      node: node,
      concepts_added: conceptsAdded,
      concepts_removed: conceptsRemoved,
      child_nodes_created: childNodesCreated
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
    children: [],
    answer: "Artificial Intelligence is a broad field of computer science focused on creating systems that can perform tasks typically requiring human intelligence."
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
    console.log('Child nodes created:', result.child_nodes_created);
    console.log('Children in parent node:', testNode.children.length);
    
    // Display comparison scores for each child node
    console.log('Child node comparison scores:');
    testNode.children.forEach((child, index) => {
      console.log(`  ${index + 1}. "${child.title}": ${child.comparisonScore}/100`);
    });
  } else {
    console.log('❌ Error:', result.error);
  }
}