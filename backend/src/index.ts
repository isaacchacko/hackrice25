<<<<<<< Updated upstream
// ESM + verbatimModuleSyntax
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { get_concepts } from './services/get_concepts.js';
import { get_answer } from './services/get_answer.js';
// CommonJS imports
const dotenv = require('dotenv');
const express = require('express');
const { make_den_main }Search: (done for terminal)
Input: query/question
Output: list of pages/links
Action: Google Search API
Burrow:
Input: Clicking on concept
Output: Search(new query) -> list of pages/links
Create Den:
Input: Act of searching (clicking enter on search or child node)
Output: List of connecting child nodes and proximity
Get_concept:
Input: page
Output: List of concepts
Action: API call
Send_to_Den:
Input: Page
Output: Array Den with page appended to it
Generate_answer:
Input: pages, concepts, question
Output: String Answer
Action: Prompt gemini based off inputs to get a general answer
Generate_comp_score:
Input: Node 1 and Node 2
Output: Score
Action: Ge = require('./services/make_den_main.js');

// Type definitions
interface Request {
  path: string;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
  send: (data: string) => void;
}

interface NextFunction {
  (): void;
}

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
      result.concepts.forEach((concept: any, index: number) => {
        console.log(`${index + 1}. ${concept.title}`);
        console.log(`   ${concept.description}\n`);
      });

      // Now test get_answer using the concepts we just extracted
      console.log('🧪 Testing get_answer function...');
      
      const testUrls = [
        'https://en.wikipedia.org/wiki/Artificial_intelligence',
        'https://en.wikipedia.org/wiki/Machine_learning'
      ];
      
      const testQuestion = 'What are the main applications and benefits of artificial intelligence?';
      
      const answerResult = await get_answer(testUrls, conceptsResult.concepts, testQuestion);
      
      console.log('📊 get_answer Test Results:');
      console.log('URLs:', testUrls);
      console.log('Question:', testQuestion);
      console.log('Concepts used:', conceptsResult.concepts.length);
      
      if (answerResult.success && answerResult.answer) {
        console.log('✅ Success! Generated answer:');
        console.log('Answer:', answerResult.answer);
        console.log('\n📚 Short Version:', answerResult.shortAnswer);
      } else {
        console.log('❌ get_answer Error:', answerResult.error);
      }
      
    } else {
      console.log('❌ get_concepts Error:', conceptsResult.error);
      console.log('⏭️ Skipping get_answer test due to get_concepts failure');
    }
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
  
  console.log('🔚 All tests completed\n');
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
