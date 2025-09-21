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

    // Check if URL is already in the denPages list
    const urlAlreadyExists = 'denPages' in node ? (node.denPages?.includes(url) || false) : false;
    if (urlAlreadyExists) {
      console.log('🔄 URL already exists in denPages, but will still extract concepts and create child nodes');
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
          // Use a default score based on concept relevance instead of 0
          comparisonScore = 50; // Default to moderate relevance
        }
      } catch (error) {
        console.error(`❌ Error calculating comparison score for "${concept.title}":`, error);
        comparisonScore = 50; // Default to moderate relevance
      }

      // Check if a child node with this concept already exists
      const existingChildIndex = 'children' in node ? 
        node.children.findIndex(child => child.title === concept.title) : -1;
      
      if (existingChildIndex !== -1 && 'children' in node) {
        // Update existing child node
        const existingChild = node.children[existingChildIndex];
        if (existingChild) {
          existingChild.pages.push(url);
          existingChild.conceptList.push(concept);
          existingChild.comparisonScore = Math.max(existingChild.comparisonScore, comparisonScore);
          console.log(`🔄 Updated existing child node: "${concept.title}" (score: ${existingChild.comparisonScore})`);
        }
      } else {
        // Create new child node
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
        console.log(`✅ Created new child node: "${concept.title}" (score: ${comparisonScore})`);
      }
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
    
    // Add the URL to the node's denPages list (only if it doesn't already exist)
    if (!urlAlreadyExists && 'denPages' in node) {
      // Initialize denPages array if it doesn't exist
      if (!node.denPages) {
        node.denPages = [];
        console.log('🔧 Initialized denPages array');
      }
      node.denPages.push(url);
      console.log(`📄 Added URL to denPages list. Total den pages: ${node.denPages.length}`);
      console.log('📄 Current denPages:', node.denPages);
    } else if ('denPages' in node) {
      console.log(`📄 URL already in denPages list. Total den pages: ${node.denPages?.length || 0}`);
    } else {
      console.log('⚠️ Node does not have denPages property');
    }

    // If this is a bigDaddyNode, run get_answer after concepts and pages have been added
    if ('query' in node && 'answer' in node) {
      console.log('🧠 Detected bigDaddyNode - updating general answer...');
      console.log('📊 Current node state:');
      console.log('  - Query:', node.query);
      console.log('  - Current answer:', node.answer);
      console.log('  - Pages count:', node.pages.length);
      console.log('  - Concepts count:', node.conceptList.length);
      
      try {
        // Only regenerate answer if we have enough content (den pages and concepts)
        const denPages = node.denPages || [];
        const hasEnoughContent = denPages.length > 0 && node.conceptList.length > 0;
        
        if (hasEnoughContent) {
          // Generate a comprehensive general answer about the topic
          const generalQuestion = `Provide a comprehensive overview and explanation of "${node.query}". Include key concepts, important details, and relevant information.`;
          
          console.log('🤖 Generating answer with question:', generalQuestion);
          console.log('📄 Using den pages:', denPages.slice(0, 3), '...');
          console.log('🧠 Using concepts:', node.conceptList.slice(0, 3), '...');
          
          const answerResult = await get_answer(
            denPages,             // URLs only from den pages (what user added)
            node.conceptList,     // Concepts from the node's conceptList
            generalQuestion       // General question about the topic
          );

          if (answerResult.success && answerResult.answer) {
            node.answer = answerResult.answer;
            node.shortAnswer = (typeof answerResult.shortAnswer === 'string' ? answerResult.shortAnswer : answerResult.answer.split(' ').slice(0, 5).join(' '));
            console.log('✅ Successfully updated bigDaddyNode general answer');
            console.log('📝 Short answer:', node.shortAnswer);
            console.log('📝 Full answer preview:', answerResult.answer.substring(0, 100) + '...');
          } else {
            console.warn(`⚠️ Failed to get general answer for bigDaddyNode: ${answerResult.error}`);
            // Keep existing answer if generation fails
          }
        } else {
          console.log('📝 Not enough content yet to generate comprehensive answer');
          // Don't create a fallback answer here since we already have one from initial creation
        }
      } catch (error) {
        console.error('❌ Error running get_answer for bigDaddyNode:', error);
        // Keep existing answer if generation fails
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