// backend/src/services/burrow.ts
import dotenv from 'dotenv';
import { search, type Page, type SearchOptions } from './search.js';

// Load environment variables
dotenv.config({ path: '../.env' });

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
export async function burrow(concept: string, opts: BurrowOptions = {}): Promise<Page[]> {
  try {
    // Validate input
    if (!concept || typeof concept !== 'string' || concept.trim().length === 0) {
      throw new Error('Invalid or empty concept provided');
    }

    // Clean and validate the concept (should be 1-2 words)
    const cleanConcept = concept.trim();
    const wordCount = cleanConcept.split(/\s+/).length;
    
    if (wordCount > 2) {
      console.warn(`Warning: Concept "${cleanConcept}" has ${wordCount} words. Consider using 1-2 words for better results.`);
    }

    // Create the "what is" query
    const query = `what is ${cleanConcept}`;
    
    console.log(`🔍 Burrowing into concept: "${cleanConcept}"`);
    console.log(`📝 Generated query: "${query}"`);

    // Use the existing search function with the generated query
    const searchOptions: SearchOptions = {
      limit: opts.limit ?? 5, // Default to 5 results for burrowing
      ...(opts.lang && { lang: opts.lang }),
      safe: opts.safe ?? "active",
      ...(opts.site && { site: opts.site })
    };

    const pages = await search(query, searchOptions);
    
    console.log(`✅ Found ${pages.length} pages for concept "${cleanConcept}"`);
    
    return pages;

  } catch (error) {
    console.error('Error in burrow:', error);
    throw error;
  }
}

// Example usage function (for testing)
export async function testBurrow() {
  const testConcepts = [
    'machine learning',
    'neural networks',
    'artificial intelligence',
    'blockchain'
  ];
  
  for (const concept of testConcepts) {
    try {
      console.log(`\n🧪 Testing burrow with concept: "${concept}"`);
      const result = await burrow(concept, { limit: 3 });
      
      console.log(`📊 Results for "${concept}":`);
      result.forEach((page, index) => {
        console.log(`${index + 1}. ${page.url}`);
      });
    } catch (error) {
      console.error(`❌ Error burrowing into "${concept}":`, error instanceof Error ? error.message : String(error));
    }
  }
}
