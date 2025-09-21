// backend/src/services/make_den_main.ts

import type { concept, DenMainResponse } from '../types/den.js';

/**
 * Creates a den main response with the given query and empty arrays for pages, concepts, and children
 * @param query - The search query string
 * @returns Promise containing the den main response structure
 */
export async function make_den_main(query: string): Promise<DenMainResponse> {
  try {
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid or empty query provided');
    }

    // Return the structured response with empty arrays
    const response: DenMainResponse = {
      query: query.trim(),
      pages: [],
      conceptList: [],
      children: [],
      answer: ""
    };

    // Console logging as requested
    console.log(`🏠 Den for "${query.trim()}" has been made`);
    console.log('📊 Den contents:');
    console.log('  - Query:', response.query);
    console.log('  - Pages array:', response.pages, `(length: ${response.pages.length})`);
    console.log('  - ConceptList array:', response.conceptList, `(length: ${response.conceptList.length})`);
    console.log('  - Children array:', response.children, `(length: ${response.children.length})`);

    return response;

  } catch (error) {
    console.error('Error in make_den_main:', error);
    throw error;
  }
}

// Example usage function (for testing)
export async function testMakeDenMain() {
  const testQuery = "artificial intelligence machine learning";
  
  try {
    const result = await make_den_main(testQuery);
    console.log('Test Results for make_den_main:');
    console.log('Query:', result.query);
    console.log('Pages:', result.pages);
    console.log('Concepts:', result.conceptList);
    console.log('Children:', result.children);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
