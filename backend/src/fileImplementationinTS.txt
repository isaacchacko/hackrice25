// ESM + verbatimModuleSyntax
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { get_concepts } from './services/get_concepts.js';
import { get_answer } from './services/get_answer.js';
import { make_den_main } from './services/make_den_main.js';
import { simplify_concepts } from './services/simplify_concepts.js';
import { search } from './services/search.js';
import { burrow } from './services/burrow.js';
import { get_comparisonScore } from './services/get_comparisonScore.js';
import { sendToDen } from './services/send_toDen.js';
import cors from 'cors';

// Load environment variables from root directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Request tracking to prevent infinite loops
const activeRequests = new Set<string>();
const requestCounts = new Map<string, number>();

interface ProxyQuery {
  url: string;
}

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

function isGoogleService(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes('google.com') ||
      parsedUrl.hostname.includes('youtube.com') ||
      parsedUrl.hostname.includes('googleapis.com');
  } catch {
    return false;
  }
}
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    return relativeUrl;
  }
}

app.get('/proxy', async (req: Request<{}, any, any, ProxyQuery>, res: Response) => {
  const { url: targetUrl } = req.query;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Valid URL parameter is required' });
  }

  // Prevent infinite loops
  const requestKey = `${req.ip}-${targetUrl}`;
  const currentCount = requestCounts.get(requestKey) || 0;

  if (currentCount > 3) {
    console.log(`Too many requests for ${targetUrl}, blocking to prevent loop`);
    return res.status(429).json({ error: 'Too many requests to this URL' });
  }

  if (activeRequests.has(requestKey)) {
    console.log(`Request already active for ${targetUrl}, blocking duplicate`);
    return res.status(429).json({ error: 'Request already in progress' });
  }

  requestCounts.set(requestKey, currentCount + 1);
  activeRequests.add(requestKey);

  // Cleanup function
  const cleanup = () => {
    activeRequests.delete(requestKey);
    setTimeout(() => {
      const count = requestCounts.get(requestKey) || 0;
      if (count > 0) {
        requestCounts.set(requestKey, count - 1);
      }
    }, 5000); // Decrease count after 5 seconds
  };

  try {
    console.log(`Proxying: ${targetUrl} (attempt ${currentCount + 1})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Enhanced headers for better compatibility
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1'
    };

    // Special handling for Google
    if (isGoogleService(targetUrl)) {
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'none';
      headers['Sec-Fetch-User'] = '?1';
      headers['Upgrade-Insecure-Requests'] = '1';
    }

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers,
      redirect: 'manual' // Handle redirects manually to prevent loops
    });

    clearTimeout(timeoutId);

    // Handle redirects manually
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        cleanup();
        const redirectUrl = resolveUrl(targetUrl, location);
        console.log(`Redirect detected: ${targetUrl} -> ${redirectUrl}`);

        // Prevent redirect loops
        if (redirectUrl === targetUrl) {
          throw new Error('Redirect loop detected');
        }

        return res.redirect(`/proxy?url=${encodeURIComponent(redirectUrl)}`);
      }
    }

    if (!response.ok && response.status !== 304) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle non-HTML content
    if (!contentType.toLowerCase().includes('text/html')) {
      const buffer = await response.arrayBuffer();

      // Copy safe headers
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!['x-frame-options', 'content-security-policy', 'set-cookie'].includes(lowerKey)) {
          res.setHeader(key, value);
        }
      });

      cleanup();
      return res.send(Buffer.from(buffer));
    }

    let html = await response.text();
    const currentUrl = new URL(targetUrl);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const proxyBase = `http://localhost:${PORT}`;

    // More aggressive Google-specific cleaning
    if (isGoogleService(targetUrl)) {
      // Remove problematic meta tags and headers
      html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?(?:x-frame-options|content-security-policy)["']?[^>]*>/gi, '');

      // Remove or neutralize frame-busting scripts
      html = html.replace(/if\s*\(\s*(?:window\.)?(?:top|parent)\s*[!=]==?\s*(?:window\.)?(?:self|window)\s*\)([^}]*\})/gi, 'if(false)$1');
      html = html.replace(/(?:window\.)?(?:top|parent)\.location\s*=\s*[^;]+;/gi, '// frame-bust blocked');
      html = html.replace(/throw\s+(?:new\s+)?Error\s*\([^)]*frame[^)]*\)/gi, '// error blocked');

      // Block specific Google security mechanisms
      html = html.replace(/document\.domain\s*=\s*["'][^"']*["']/gi, '// document.domain blocked');
      html = html.replace(/window\.name\s*=\s*["'][^"']*["']/gi, '// window.name blocked');
    }

    // URL rewriting with better link handling
    html = html.replace(/href\s*=\s*["']([^"']+)["']/gi, (match: string, url: string): string => {
      if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:') || url === '/') {
        return match;
      }
      try {
        const absoluteUrl = resolveUrl(targetUrl, url);
        const proxiedUrl = `${proxyBase}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        return `href="${proxiedUrl}"`;
      } catch {
        return match;
      }
    });

    // Fix resources (images, scripts, stylesheets)
    html = html.replace(/src\s*=\s*["']([^"']+)["']/gi, (match: string, url: string): string => {
      if (url.startsWith('data:') || url.startsWith('javascript:')) {
        return match;
      }
      try {
        const absoluteUrl = resolveUrl(targetUrl, url);
        return `src="${absoluteUrl}"`;
      } catch {
        return match;
      }
    });

    // Fix CSS url() references
    html = html.replace(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, (match: string, url: string): string => {
      if (url.startsWith('data:') || url.startsWith('#')) {
        return match;
      }
      try {
        const absoluteUrl = resolveUrl(targetUrl, url);
        return `url("${absoluteUrl}")`;
      } catch {
        return match;
      }
    });

    // Fix form actions
    html = html.replace(/action\s*=\s*["']([^"']*?)["']/gi, (match: string, url: string): string => {
      if (!url || url === '#') return match;
      try {
        const absoluteUrl = resolveUrl(targetUrl, url);
        const proxiedUrl = `${proxyBase}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        return `action="${proxiedUrl}"`;
      } catch {
        return match;
      }
    });

    // Add base tag
    const baseTag = `<base href="${baseUrl}/" target="_self">`;
    if (!html.includes('<base ')) {
      html = html.replace(/<head[^>]*>/i, (match: string) => match + baseTag);
    }

    // Minimal, non-conflicting notification script
    const notificationScript = `
<script>
(function() {
  // Only notify parent, don't interfere with page functionality
  function notifyParent() {
    try {
      if (window.parent && window.parent !== window && window.parent.postMessage) {
        window.parent.postMessage({
          type: 'urlChanged',
          url: '${targetUrl}',
          title: document.title || 'Untitled'
        }, 'http://localhost:3000');
      }
    } catch (e) {
      // Silently fail
    }
  }
  
  // Delayed notification to avoid conflicts
  setTimeout(notifyParent, 500);
  
  // Listen for title changes
  const originalTitle = document.title;
  setInterval(() => {
    if (document.title !== originalTitle) {
      notifyParent();
    }
  }, 1000);
})();
</script>`;

    // Insert script at end of body to avoid conflicts
    if (html.includes('</body>')) {
      html = html.replace(/<\/body>/i, notificationScript + '</body>');
    } else {
      html += notificationScript;
    }

    // Set permissive headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    cleanup();
    res.send(html);

  } catch (error) {
    cleanup();
    console.error('Proxy error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timeout', url: targetUrl });
      }

      return res.status(500).json({
        error: 'Failed to proxy the requested URL',
        message: error.message,
        url: targetUrl
      });
    }

    res.status(500).json({ error: 'Unknown error occurred', url: targetUrl });
  }
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
    console.log('Concepts:', result.conceptList);
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
  // Test the sendToDen function immediately when server starts
  (async () => {
    console.log('🧪 Testing sendToDen function...');

    try {
      // Use the parentNode from make_den_main test
      const testQuery = 'artificial intelligence machine learning';
      const parentNode = await make_den_main(testQuery);

      console.log('📊 ParentNode BEFORE sendToDen:');
      console.log('Query:', parentNode.query);
      console.log('Pages count:', parentNode.pages.length);
      console.log('Pages:', parentNode.pages);
      console.log('Concepts count:', parentNode.conceptList.length);
      console.log('Concepts:');
      parentNode.conceptList.forEach((concept, index) => {
        console.log(`  ${index + 1}. ${concept.title}: ${concept.description}`);
      });
      console.log('Children count:', parentNode.children.length);
      console.log('');

      // Test sendToDen with a new URL
      const testUrl = 'https://en.wikipedia.org/wiki/Machine_learning';
      console.log(`📤 Sending to den: ${testUrl}`);

      const result = await sendToDen(testUrl, parentNode);

      console.log('📊 SendToDen Results:');
      if (result.success) {
        console.log('✅ Success!');
        console.log('Concepts added:', result.concepts_added);
        console.log('Concepts removed during simplification:', result.concepts_removed);
      } else {
        console.log('❌ Error:', result.error);
      }

      console.log('');
      console.log('📊 ParentNode AFTER sendToDen:');
      console.log('Query:', parentNode.query);
      console.log('Pages count:', parentNode.pages.length);
      console.log('Pages:', parentNode.pages);
      console.log('Concepts count:', parentNode.conceptList.length);
      console.log('Concepts:');
      parentNode.conceptList.forEach((concept, index) => {
        console.log(`  ${index + 1}. ${concept.title}: ${concept.description}`);
      });
      console.log('Children count:', parentNode.children.length);

      console.log('✅ sendToDen test completed successfully!');
    } catch (error) {
      console.log('❌ sendToDen test failed:', error);
    }

    console.log('🔚 sendToDen test completed\n');
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

})();
app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
