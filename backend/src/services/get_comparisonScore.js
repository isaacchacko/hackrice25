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
 * Calculates a similarity score between two strings using Gemini AI
 * @param string1 - First string to compare
 * @param string2 - Second string to compare
 * @returns Promise containing similarity score (0-100) or error information
 */
export async function get_comparisonScore(string1, string2) {
    try {
        // Validate inputs
        if (!string1 || typeof string1 !== 'string' || string1.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid or empty first string provided'
            };
        }
        if (!string2 || typeof string2 !== 'string' || string2.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid or empty second string provided'
            };
        }
        // If strings are identical, return 100
        if (string1.trim().toLowerCase() === string2.trim().toLowerCase()) {
            return {
                success: true,
                score: 100
            };
        }
        // Create the prompt
        const prompt = `
You are an AI assistant tasked with calculating the similarity score between two strings/concepts.

STRING 1: ${string1.trim()}
STRING 2: ${string2.trim()}

Instructions:
1. Analyze the semantic similarity between these two strings
2. Consider their meaning, context, and relatedness
3. Assign a similarity score from 0 to 100 where:
   - 100 = Identical or extremely similar concepts (e.g., "ML" vs "Machine Learning")
   - 80-99 = Very similar concepts with minor differences
   - 60-79 = Related concepts that share significant common ground
   - 40-59 = Somewhat related concepts with some overlap
   - 20-39 = Loosely related concepts with minimal connection
   - 0-19 = Unrelated or completely different concepts

Return your response in valid JSON format like this:
{
  "score": 85
}

Only return the numeric score as an integer between 0 and 100.
`;
        // Generate comparison score using Gemini API
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
        if (typeof parsedResponse.score !== 'number') {
            return {
                success: false,
                error: 'Invalid response structure from AI - missing or invalid score'
            };
        }
        // Ensure score is within valid range
        const score = Math.max(0, Math.min(100, Math.round(parsedResponse.score)));
        return {
            success: true,
            score
        };
    }
    catch (error) {
        console.error('Error in get_comparisonScore:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
// Example usage function (for testing)
export async function testGetComparisonScore() {
    const testCases = [
        { str1: "Machine Learning", str2: "ML" },
        { str1: "Neural Networks", str2: "Artificial Neural Networks" },
        { str1: "Deep Learning", str2: "Cooking Recipes" },
        { str1: "Artificial Intelligence", str2: "AI" },
        { str1: "Computer Science", str2: "Software Engineering" }
    ];
    console.log('Testing comparison scores:');
    for (const testCase of testCases) {
        try {
            const result = await get_comparisonScore(testCase.str1, testCase.str2);
            if (result.success) {
                console.log(`"${testCase.str1}" vs "${testCase.str2}": ${result.score}/100`);
            }
            else {
                console.log(`Error comparing "${testCase.str1}" vs "${testCase.str2}": ${result.error}`);
            }
        }
        catch (error) {
            console.log(`Test failed for "${testCase.str1}" vs "${testCase.str2}":`, error);
        }
    }
}
//# sourceMappingURL=get_comparisonScore.js.map