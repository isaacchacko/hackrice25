// Using direct fetch instead of the problematic library
async function callGeminiAPI(content) {
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
    console.log("CONCEPTS ARE ", data);
    return data.candidates[0].content.parts[0].text;
}
/**
 * Extracts the top 3 concepts from a webpage using Gemini AI
 * @param link - The URL of the webpage to analyze
 * @returns Promise containing the top 3 concepts or error information
 */
export async function get_concepts(link) {
    try {
        // Validate URL
        if (!link || typeof link !== 'string') {
            return {
                success: false,
                error: 'Invalid URL provided'
            };
        }
        // Fetch webpage content
        const response = await fetch(link);
        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch webpage: ${response.statusText}`
            };
        }
        const html = await response.text();
        // Extract text content from HTML (basic text extraction)
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        // Limit content length to avoid token limits
        const maxLength = 8000; // Adjust based on your needs
        const content = textContent.length > maxLength
            ? textContent.substring(0, maxLength) + '...'
            : textContent;
        // Create the prompt
        const prompt = `
  Analyze the following webpage content and identify the top 3 most important concepts discussed. 
  
  For each concept, provide:
  1. A clear, concise title (2-5 words)
  2. A brief description (1-2 sentences)

  
  Return the response in valid JSON format like this:
  {
    "concepts": [
      {
        "title": "Concept Title",
        "description": "Brief description of the concept",
      }
    ]
  }
  
  Webpage content:
  ${content}
  `;
        // Generate content using direct API call
        console.log('🤖 Calling Gemini API with prompt...');
        const response_text = await callGeminiAPI(prompt);
        console.log('🤖 Raw Gemini response:', response_text);
        // Parse the JSON response
        let parsedResponse;
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = response_text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : response_text;
            console.log('🔍 Extracted JSON string:', jsonString);
            parsedResponse = JSON.parse(jsonString);
            console.log('✅ Parsed response:', parsedResponse);
        }
        catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('❌ Raw response that failed to parse:', response_text);
            return {
                success: false,
                error: 'Failed to parse AI response as JSON'
            };
        }
        // Validate response structure
        if (!parsedResponse.concepts || !Array.isArray(parsedResponse.concepts)) {
            return {
                success: false,
                error: 'Invalid response structure from AI'
            };
        }
        // Ensure we only return top 3 concepts
        const concepts = parsedResponse.concepts.slice(0, 3);
        console.log("CONCEPTS ARE ", concepts);
        return {
            success: true,
            concepts
        };
    }
    catch (error) {
        console.error('Error in get_concepts:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
// Example usage function (for testing)
export async function testGetConcepts() {
    const result = await get_concepts('https://example.com');
    console.log(result);
}
//# sourceMappingURL=get_concepts.js.map