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
    return data.candidates[0].content.parts[0].text;
}
/**
 * Removes duplicate and similar concepts from a list of concepts using Gemini AI
 * @param concepts - Array of concepts to deduplicate
 * @returns Promise containing deduplicated concepts or error information
 */
export async function simplify_concepts(concepts) {
    try {
        // Validate inputs
        if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
            return {
                success: false,
                error: 'Invalid or empty concepts array provided'
            };
        }
        // If only one concept, no need to simplify
        if (concepts.length === 1) {
            return {
                success: true,
                concepts: concepts,
                removed_count: 0
            };
        }
        // Prepare concepts text for analysis
        const conceptsText = concepts
            .map((concept, index) => `${index + 1}. ${concept.title}: ${concept.description}`)
            .join('\n');
        // Create the prompt
        const prompt = `
You are an AI assistant tasked with removing duplicate and similar concepts from a list.

CONCEPTS TO ANALYZE:
${conceptsText}

Instructions:
1. Identify concepts that are essentially the same or very similar in meaning
2. For similar concepts, keep the one with the most comprehensive or clear description
3. Remove concepts that are redundant or duplicate
4. Preserve concepts that are distinct, even if they're related
5. Maintain the original title and description format for kept concepts

Return your response in valid JSON format like this:
{
  "concepts": [
    {
      "title": "Concept Title",
      "description": "Brief description of the concept"
    }
  ],
  "removed_count": 3
}

Only include concepts that should be kept in the final list. The removed_count should indicate how many concepts were removed due to duplication/similarity.
`;
        // Generate deduplicated concepts using Gemini API
        const response_text = await callGeminiAPI(prompt);
        // Parse the JSON response
        let parsedResponse;
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = response_text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : response_text;
            parsedResponse = JSON.parse(jsonString);
        }
        catch (parseError) {
            return {
                success: false,
                error: 'Failed to parse AI response as JSON'
            };
        }
        // Validate response structure
        if (!parsedResponse.concepts || !Array.isArray(parsedResponse.concepts)) {
            return {
                success: false,
                error: 'Invalid response structure from AI - missing concepts array'
            };
        }
        // Validate that each concept has required properties
        const validConcepts = parsedResponse.concepts.filter((concept) => concept &&
            typeof concept.title === 'string' &&
            typeof concept.description === 'string' &&
            concept.title.trim().length > 0 &&
            concept.description.trim().length > 0);
        if (validConcepts.length === 0) {
            return {
                success: false,
                error: 'No valid concepts found in AI response'
            };
        }
        // Calculate removed count
        const removedCount = concepts.length - validConcepts.length;
        return {
            success: true,
            concepts: validConcepts,
            removed_count: removedCount >= 0 ? removedCount : 0
        };
    }
    catch (error) {
        console.error('Error in simplify_concepts:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
// Example usage function (for testing)
export async function testSimplifyConcepts() {
    const testConcepts = [
        {
            title: "Machine Learning",
            description: "A subset of AI that enables computers to learn without being explicitly programmed."
        },
        {
            title: "ML",
            description: "Algorithms that allow computers to learn from data automatically."
        },
        {
            title: "Neural Networks",
            description: "Computing systems inspired by biological neural networks."
        },
        {
            title: "Artificial Neural Networks",
            description: "Networks of artificial neurons that mimic the brain's structure."
        },
        {
            title: "Deep Learning",
            description: "A subset of machine learning using multi-layer neural networks."
        }
    ];
    const result = await simplify_concepts(testConcepts);
    console.log(result);
}
//# sourceMappingURL=simplify_concepts.js.map