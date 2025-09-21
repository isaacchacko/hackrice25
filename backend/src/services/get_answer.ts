// Using direct fetch instead of the problematic library
async function callGeminiAPI(content: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: content
        }]
      }]
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
  
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

interface Concept {
  title: string;
  description: string;
}

interface GetAnswerResponse {
  success: boolean;
  answer?: string;
  shortAnswer?: string[];
  error?: string;
}

/**
 * Fetches content from a single URL
 * @param url - The URL to fetch content from
 * @returns Promise containing the text content or null if failed
 */
async function fetchUrlContent(url: string): Promise<{ url: string, content: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    
    // Extract text content from HTML (basic text extraction)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit content length to avoid token limits (smaller per URL since we have multiple)
    const maxLength = 3000; // Reduced since we'll have multiple URLs
    const content = textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...' 
      : textContent;

    return { url, content };
  } catch (error) {
    console.warn(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Answers a question using multiple URLs as sources and provided concepts
 * @param urls - Array of URLs to use as sources
 * @param concepts - Array of relevant concepts to consider
 * @param question - The question to answer
 * @returns Promise containing the answer and sources used or error information
 */
export async function get_answer(
  urls: string[], 
  concepts: Concept[], 
  question: string
): Promise<GetAnswerResponse> {
  try {
    // Validate inputs
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return {
        success: false,
        error: 'Invalid or empty URLs array provided'
      };
    }

    if (!concepts || !Array.isArray(concepts)) {
      return {
        success: false,
        error: 'Invalid concepts array provided'
      };
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid or empty question provided'
      };
    }

    // Fetch content from all URLs
    console.log(`Fetching content from ${urls.length} URLs...`);
    const fetchPromises = urls.map(url => fetchUrlContent(url));
    const results = await Promise.all(fetchPromises);
    
    // Filter out failed fetches
    const successfulFetches = results.filter(result => result !== null) as Array<{ url: string, content: string }>;
    
    if (successfulFetches.length === 0) {
      return {
        success: false,
        error: 'Failed to fetch content from any of the provided URLs'
      };
    }

    // Prepare sources text
    const sourcesText = successfulFetches
      .map((source, index) => `Source ${index + 1} (${source.url}):\n${source.content}`)
      .join('\n\n---\n\n');

    // Prepare concepts text
    const conceptsText = concepts
      .map(concept => `- ${concept.title}: ${concept.description}`)
      .join('\n');

    // Create the prompt
    const prompt = `
You are an AI assistant tasked with answering a question using the provided sources and concepts.

QUESTION: ${question}

RELEVANT CONCEPTS TO CONSIDER:
${conceptsText}

SOURCES:
${sourcesText}

Instructions:
1. Answer the question comprehensively using information from the provided sources
2. Consider the relevant concepts when formulating your answer and integrate them naturally
3. Be factual and cite information appropriately
4. If the sources don't contain enough information to fully answer the question, acknowledge this limitation
5. Provide a clear, well-structured response that flows naturally
6. Create a SHORT answer that is 5 words or less for display purposes
7. Create a COMPREHENSIVE answer that includes:
   - A detailed explanation of the topic
   - Integration of the key concepts provided
   - Clear structure and organization
   - Relevant details from the sources

Return your response in valid JSON format like this:
{
  "answer": "Your comprehensive detailed answer here that integrates the concepts naturally...",
  "shortAnswer": "Brief 5 word summary"
}

IMPORTANT: 
- The shortAnswer must be 5 words or less and should capture the essence of the topic
- The answer should naturally incorporate the provided concepts
- Make sure to include only the URLs of sources that you actually referenced in your answer
`;

    // Generate answer using Gemini API
    const response_text = await callGeminiAPI(prompt);

    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response_text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response_text;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse AI response as JSON'
      };
    }

    // Validate response structure
    if (!parsedResponse.answer || typeof parsedResponse.answer !== 'string') {
      return {
        success: false,
        error: 'Invalid response structure from AI - missing answer'
      };
    }

    // Validate shortAnswer and ensure it's 5 words or less
    let shortAnswer = parsedResponse.shortAnswer;
    if (!shortAnswer || typeof shortAnswer !== 'string') {
      // Generate a fallback short answer from the first few words of the main answer
      const words = parsedResponse.answer.split(' ').slice(0, 5);
      shortAnswer = words.join(' ');
    } else {
      // Ensure shortAnswer is 5 words or less
      const words = shortAnswer.split(' ');
      if (words.length > 5) {
        shortAnswer = words.slice(0, 5).join(' ');
      }
    }

    // Ensure sources_used is an array (default to empty array if not provided)
    const sources_used = Array.isArray(parsedResponse.sources_used) 
      ? parsedResponse.sources_used 
      : successfulFetches.map(source => source.url);

    return {
      success: true,
      answer: parsedResponse.answer,
      shortAnswer: shortAnswer
    };

  } catch (error) {
    console.error('Error in get_answer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Example usage function (for testing)
export async function testGetAnswer() {
  const testUrls = [
    'https://example.com/article1',
    'https://example.com/article2'
  ];
  
  const testConcepts = [
    {
      title: "Machine Learning",
      description: "A subset of AI that enables computers to learn without being explicitly programmed."
    },
    {
      title: "Neural Networks",
      description: "Computing systems inspired by biological neural networks."
    }
  ];
  
  const testQuestion = "What are the main applications of machine learning?";
  
  const result = await get_answer(testUrls, testConcepts, testQuestion);
  console.log(result);
}