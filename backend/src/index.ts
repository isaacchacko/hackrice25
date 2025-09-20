// ESM + verbatimModuleSyntax
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { get_concepts } from './services/get_concepts.js';
import { get_comparisonScore } from './services/get_comparisonScore.js';
import { get_answer } from './services/get_answer.js';
import { make_den_main } from './services/make_den_main.js';
import { simplify_concepts } from './services/simplify_concepts.js';
import { search } from './services/search.js';
import { burrow } from './services/burrow.js';

// Load environment variables from root directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Backend up');
});

// Test both functions when server starts
(async () => {
  console.log('🧪 Testing get_concepts function...');
  
  try {
    const testUrl = 'https://en.wikipedia.org/wiki/Artificial_intelligence';
    const conceptsResult = await get_concepts(testUrl);
    
    console.log('📊 get_concepts Test Results:');
    console.log('URL:', testUrl);
    
    if (conceptsResult.success && conceptsResult.concepts) {
      console.log('✅ Success! Found concepts:');
      conceptsResult.concepts.forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.title}`);
        console.log(`   ${concept.description}\n`);
      });

      // Test simplify_concepts with the extracted concepts plus some duplicates
      console.log('🧪 Testing simplify_concepts function...');
      
      // Create some duplicate concepts to test the simplification
      const testConceptsWithDuplicates = [
        ...conceptsResult.concepts,
        {
          title: "AI",
          description: "Artificial intelligence systems that can perform human-like tasks."
        },
        {
          title: "Machine Intelligence",
          description: "Computer systems capable of learning and reasoning."
        }
      ];

      console.log('📊 Original concepts before simplification:');
      console.log('Total count:', testConceptsWithDuplicates.length);
      testConceptsWithDuplicates.forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.title}`);
        console.log(`   ${concept.description}\n`);
      });

      const simplifyResult = await simplify_concepts(testConceptsWithDuplicates);
      
      console.log('📊 simplify_concepts Test Results:');
      
      if (simplifyResult.success && simplifyResult.concepts) {
        console.log('✅ Success! Simplified concepts:');
        console.log('Final concepts count:', simplifyResult.concepts.length);
        console.log('Concepts removed:', simplifyResult.removed_count);
        
        simplifyResult.concepts.forEach((concept, index) => {
          console.log(`${index + 1}. ${concept.title}`);
          console.log(`   ${concept.description}\n`);
        });

        // Now test get_answer using the simplified concepts
        console.log('🧪 Testing get_answer function with simplified concepts...');
        
        const testUrls = [
          'https://en.wikipedia.org/wiki/Artificial_intelligence',
          'https://en.wikipedia.org/wiki/Machine_learning'
        ];
        
        const testQuestion = 'What are the main applications and benefits of artificial intelligence?';
        
        const answerResult = await get_answer(testUrls, simplifyResult.concepts, testQuestion);
        
        console.log('📊 get_answer Test Results:');
        console.log('URLs:', testUrls);
        console.log('Question:', testQuestion);
        console.log('Simplified concepts used:', simplifyResult.concepts.length);
        
        if (answerResult.success && answerResult.answer) {
          console.log('✅ Success! Generated answer:');
          console.log('Answer:', answerResult.answer);
          console.log('\n📚 Short Version:', answerResult.shortAnswer);
        } else {
          console.log('❌ get_answer Error:', answerResult.error);
        }
        
      } else {
        console.log('❌ simplify_concepts Error:', simplifyResult.error);
      }
      
    } else {
      console.log('❌ get_concepts Error:', conceptsResult.error);
      console.log('⏭️ Skipping subsequent tests due to get_concepts failure');
    }
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
  
  console.log('🔚 All tests completed\n');
})();

// Test the make_den_main function immediately when server starts
(async () => {
  console.log('🧪 Testing make_den_main function...');
  
  try {
    const testQuery = 'artificial intelligence machine learning';
    const result = await make_den_main(testQuery);
    
    console.log('📊 Test Results:');
    console.log('Query:', result.query);
    console.log('Pages:', result.pages);
    console.log('Concepts:', result.concepts);
    console.log('Children:', result.children);
    
    console.log('✅ make_den_main test completed successfully!');
  } catch (error) {
    console.log('❌ make_den_main test failed:', error);
  }
  
  console.log('🔚 make_den_main test completed\n');
})();

// Test the burrow function immediately when server starts
(async () => {
  console.log('🧪 Testing burrow function...');
  
  try {
    const testConcept = 'machine learning';
    const result = await burrow(testConcept, { limit: 3 });
    
    console.log('📊 Burrow Test Results:');
    console.log('Concept:', testConcept);
    console.log('Pages found:', result.length);
    
    if (result.length > 0) {
      console.log('✅ Success! Found pages:');
      result.forEach((page, index) => {
        console.log(`${index + 1}. ${page.url}`);
      });
    } else {
      console.log('❌ No pages found');
    }
    
    console.log('✅ burrow test completed successfully!');
  } catch (error) {
    console.log('❌ burrow test failed:', error);
  }
  
  console.log('🔚 burrow test completed\n');
})();

// Test the get_comparisonScore function immediately when server starts
(async () => {
  console.log('🧪 Testing get_comparisonScore function...');
  
  try {
    const testCases = [
      { str1: "Machine Learning", str2: "ML" },
      { str1: "Neural Networks", str2: "Artificial Neural Networks" },
      { str1: "Deep Learning", str2: "Cooking Recipes" },
      { str1: "Artificial Intelligence", str2: "AI" },
      { str1: "Computer Science", str2: "Software Engineering" },
      { str1: "Python Programming", str2: "JavaScript Development" }
    ];
    
    console.log('📊 Comparison Score Test Results:');
    
    for (const testCase of testCases) {
      try {
        const result = await get_comparisonScore(testCase.str1, testCase.str2);
        if (result.success && result.score !== undefined) {
          console.log(`✅ "${testCase.str1}" vs "${testCase.str2}": ${result.score}/100`);
        } else {
          console.log(`❌ Error comparing "${testCase.str1}" vs "${testCase.str2}": ${result.error}`);
        }
      } catch (error) {
        console.log(`💥 Test failed for "${testCase.str1}" vs "${testCase.str2}":`, error);
      }
    }
    
    console.log('✅ get_comparisonScore test completed successfully!');
  } catch (error) {
    console.log('❌ get_comparisonScore test failed:', error);
  }
  
  console.log('🔚 get_comparisonScore test completed\n');
})();

// API endpoints for testing the functions
app.post('/get-concepts', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await get_concepts(url);
    res.json(result);
  } catch (error) {
    console.error('Error in /get-concepts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/get-answer', async (req: Request, res: Response) => {
  try {
    const { urls, concepts, question } = req.body;
    
    if (!urls || !concepts || !question) {
      return res.status(400).json({ 
        error: 'urls, concepts, and question are all required' 
      });
    }
    
    const result = await get_answer(urls, concepts, question);
    res.json(result);
  } catch (error) {
    console.error('Error in /get-answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/simplify-concepts', async (req: Request, res: Response) => {
  try {
    const { concepts } = req.body;
    
    if (!concepts || !Array.isArray(concepts)) {
      return res.status(400).json({ error: 'concepts array is required' });
    }
    
    const result = await simplify_concepts(concepts);
    res.json(result);
  } catch (error) {
    console.error('Error in /simplify-concepts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/make-den-main', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await make_den_main(query);
    res.json(result);
  } catch (error) {
    console.error('Error in /make-den-main:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/burrow', async (req: Request, res: Response) => {
  try {
    const { concept, limit, lang, safe, site } = req.body;
    
    if (!concept) {
      return res.status(400).json({ error: 'Concept is required' });
    }
    
    const burrowOptions = {
      ...(limit && { limit }),
      ...(lang && { lang }),
      ...(safe && { safe }),
      ...(site && { site })
    };
    
    const result = await burrow(concept, burrowOptions);
    res.json({ success: true, concept, pages: result });
  } catch (error) {
    console.error('Error in /burrow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});