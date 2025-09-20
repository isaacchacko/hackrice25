// ESM + verbatimModuleSyntax
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { get_concepts } from './services/get_concepts.js';

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

// Test the get_concepts function immediately when server starts
(async () => {
  console.log('🧪 Testing get_concepts function...');
  
  try {
    const testUrl = 'https://en.wikipedia.org/wiki/Artificial_intelligence';
    const result = await get_concepts(testUrl);
    
    console.log('📊 Test Results:');
    console.log('URL:', testUrl);
    
    if (result.success && result.concepts) {
      console.log('✅ Success! Found concepts:');
      result.concepts.forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.title}`);
        console.log(`   ${concept.description}\n`);
      });
    } else {
      console.log('❌ Error:', result.error);
    }
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
  
  console.log('🔚 Test completed\n');
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