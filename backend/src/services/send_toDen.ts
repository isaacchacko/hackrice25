import { get_concepts } from './get_concepts.js';
import { simplify_concepts } from './simplify_concepts.js';
import { get_comparisonScore } from './get_comparisonScore.js';
import { get_answer } from './get_answer.js';
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
  console.log('🚀 sendToDen called with:', { 
    url, 
    nodeTitle: 'query' in node ? node.query : node.title,
    initialPages: node.pages.length,
    initialConcepts: node.conceptList.length,
    initialChildren: 'children' in node ? node.children.length : 'N/A'
  });

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
    const urlAlreadyExists = node.pages.includes(url);
    if (urlAlreadyExists) {
      console.log('🔄 URL already exists in node, but will still extract concepts and create child nodes');
    }

    // Extract concepts from the URL
    console.log(`🔍 Extracting concepts from: ${url}`);
    const conceptsResult = await get_concepts(url);

    if (!conceptsResult.success || !conceptsResult.concepts) {
      return {
        success: false,
        error: `Failed to extract concepts from URL: ${conceptsResult.error}`
      };
    }

    // Store original concept count for tracking
    const originalConceptCount = node.conceptList.length;
    const newConcepts = conceptsResult.concepts;
    
    console.log(`📝 Extracted ${newConcepts.length} new concepts`);

    // Add new concepts to the node's conceptList
    node.conceptList.push(...newConcepts);

    // Create child nodes for each new concept
    console.log('👶 Creating child nodes for new concepts...');
    const newChildNodes: babyNode[] = [];
    
    for (const concept of newConcepts) {
      // Calculate comparison score between concept title and parent node query/title
      let comparisonScore = 0;
      try {
        const parentQuery = 'query' in node ? node.query : node.title;
        console.log(`📊 Calculating comparison score for "${concept.title}" vs "${parentQuery}"`);
        
        const scoreResult = await get_comparisonScore(concept.title, parentQuery);
        if (scoreResult.success && typeof scoreResult.score === 'number') {
          comparisonScore = scoreResult.score;
          console.log(`📊 Comparison score: ${comparisonScore}/100`);
        } else {
          console.warn(`⚠️ Failed to calculate comparison score: ${scoreResult.error}`);
          comparisonScore = 0; // Default to 0 if calculation fails
        }
      } catch (error) {
        console.error(`❌ Error calculating comparison score for "${concept.title}":`, error);
        comparisonScore = 0; // Default to 0 if calculation fails
      }

      const childNode: babyNode = {
        title: concept.title,
        pages: [url],
        conceptList: [concept],
        denned: false,
        parent: null, // Set to null initially to avoid circular refs during processing
        children: [],
        comparisonScore: comparisonScore
      };
      
      newChildNodes.push(childNode);
      console.log(`✅ Created child node: "${concept.title}" (score: ${comparisonScore})`);
    }

    // Add new child nodes to the parent node's children array
    if ('children' in node) {
      node.children.push(...newChildNodes);
      
      // Set parent references after adding to avoid circular issues during processing
      newChildNodes.forEach(child => {
        child.parent = node;
      });
      
      console.log(`📈 Added ${newChildNodes.length} child nodes to parent`);
    }

    // Simplify the conceptList to remove duplicates
    console.log('🔄 Simplifying concept list...');
    const simplifyResult = await simplify_concepts(node.conceptList);

    if (!simplifyResult.success || !simplifyResult.concepts) {
      return {
        success: false,
        error: `Failed to simplify concepts: ${simplifyResult.error}`
      };
    }

    // Update the node's conceptList with simplified concepts
    const conceptsRemoved = simplifyResult.removed_count || 0;
    node.conceptList = simplifyResult.concepts;
    console.log(`🔄 Concept simplification complete. Removed ${conceptsRemoved} duplicates`);
    
    // Add the URL to the node's pages list (only if it doesn't already exist)
    if (!urlAlreadyExists) {
      node.pages.push(url);
      console.log(`📄 Added URL to pages list. Total pages: ${node.pages.length}`);
    } else {
      console.log(`📄 URL already in pages list. Total pages: ${node.pages.length}`);
    }

    // If this is a bigDaddyNode, run get_answer after concepts and pages have been added
    if ('query' in node && 'answer' in node) {
      console.log('🧠 Detected bigDaddyNode - updating answer...');
      
      try {
        const answerResult = await get_answer(
          node.pages,           // URLs from the node's pageList
          node.conceptList,     // Concepts from the node's conceptList
          node.query           // The query from the bigDaddyNode
        );

        if (answerResult.success && answerResult.answer) {
          node.answer = answerResult.answer;
          console.log('✅ Successfully updated bigDaddyNode answer');
        } else {
          console.warn(`⚠️ Failed to get answer for bigDaddyNode: ${answerResult.error}`);
          // Don't fail the entire operation, just log the warning
        }
      } catch (error) {
        console.error('❌ Error running get_answer for bigDaddyNode:', error);
        // Don't fail the entire operation, just log the error
      }
    }

    // Calculate statistics
    const conceptsAdded = newConcepts.length;
    const childNodesCreated = newChildNodes.length;
    const finalConceptCount = node.conceptList.length;

    console.log('📊 Processing Summary:');
    console.log(`  - Concepts added: ${conceptsAdded}`);
    console.log(`  - Concepts removed: ${conceptsRemoved}`);
    console.log(`  - Child nodes created: ${childNodesCreated}`);
    console.log(`  - Final concept count: ${finalConceptCount}`);
    console.log(`  - Final pages count: ${node.pages.length}`);

    // Log child node details
    if ('children' in node && node.children.length > 0) {
      console.log('👶 Child nodes summary:');
      node.children.forEach((child, index) => {
        console.log(`  ${index + 1}. "${child.title}" (score: ${child.comparisonScore || 'N/A'})`);
      });
    }

    return {
      success: true,
      node: node,
      concepts_added: conceptsAdded,
      concepts_removed: conceptsRemoved,
      child_nodes_created: childNodesCreated
    };

  } catch (error) {
    console.error('❌ Error in sendToDen:', error);
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

  console.log('🧪 Testing sendToDen function...');
  console.log('📊 Initial state:');
  console.log('  - Concept count:', testNode.conceptList.length);
  console.log('  - Pages count:', testNode.pages.length);
  console.log('  - Children count:', testNode.children.length);
  console.log('  - Answer length:', testNode.answer.length);

  const result = await sendToDen('https://en.wikipedia.org/wiki/Artificial_intelligence', testNode);
  
  if (result.success) {
    console.log('✅ Test completed successfully!');
    console.log('📊 Final state:');
    console.log('  - Concept count:', testNode.conceptList.length);
    console.log('  - Pages count:', testNode.pages.length);
    console.log('  - Children count:', testNode.children.length);
    console.log('  - Answer length:', testNode.answer.length);
    console.log('📈 Processing results:');
    console.log('  - Concepts added:', result.concepts_added);
    console.log('  - Concepts removed:', result.concepts_removed);
    console.log('  - Child nodes created:', result.child_nodes_created);
    
    if (testNode.children.length > 0) {
      console.log('👶 Child node comparison scores:');
      testNode.children.forEach((child, index) => {
        console.log(`  ${index + 1}. "${child.title}": ${child.comparisonScore}/100`);
      });
    }
  } else {
    console.log('❌ Test failed:', result.error);
  }
}