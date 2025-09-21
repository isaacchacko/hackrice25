// ESM + verbatimModuleSyntax
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { get_concepts } from './services/get_concepts.js';
import { get_answer } from './services/get_answer.js';
import { make_den_main } from './services/make_den_main.js';
import { simplify_concepts } from './services/simplify_concepts.js';
import { search, searchWithCentralNode, getCentralBigDaddyNode, getCurrentHopSession, getCurrentFocusNode } from './services/search.js';
import { burrow } from './services/burrow.js';
import { get_comparisonScore } from './services/get_comparisonScore.js';
import { sendToDen } from './services/send_toDen.js';
import { createHopSession, getHopSession, navigateHop, getCurrentPage, getAllPages, deleteHopSession, listActiveSessions } from './services/hop.js';
import cors from 'cors';

// Load environment variables from root directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'], // Add 3001
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

app.get('/search', async (req: Request, res: Response) => {
  console.log("sdfsdfdsfsdfsddfswdfsdfsdfsfdssdf")
  try {
    const { query, options = {} } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Parse options safely
    const searchOptions: any = {};
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      if (options.limit && typeof options.limit === 'string') {
        searchOptions.limit = parseInt(options.limit, 10);
      }
      if (options.lang && typeof options.lang === 'string') {
        searchOptions.lang = options.lang;
      }
      if (options.safe && typeof options.safe === 'string') {
        searchOptions.safe = options.safe as 'off' | 'active';
      }
      if (options.site && Array.isArray(options.site)) {
        searchOptions.site = options.site.filter((s): s is string => typeof s === 'string');
      }
    }

    // Call the enhanced search function with central node management
    const searchResult = await searchWithCentralNode(query, {
      limit: searchOptions.limit || 10,
      lang: searchOptions.lang,
      safe: searchOptions.safe || 'active',
      site: searchOptions.site
    });

    // Return both the search results and the central node information
    res.json({
      pages: searchResult.pages,
      centralNode: searchResult.centralNode,
      hopSessionId: searchResult.hopSessionId
    });
  } catch (error) {
    console.error('Error in /search:', error);

    if (error instanceof Error) {
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// New endpoint to get the current central node state
app.get('/central-node-state', (req: Request, res: Response) => {
  try {
    const centralNode = getCentralBigDaddyNode();
    const hopSession = getCurrentHopSession();
    const focusNode = getCurrentFocusNode();
    
    res.json({
      success: true,
      centralNode: centralNode,
      hopSession: hopSession,
      focusNode: focusNode,
      hasCentralNode: centralNode !== null,
      hasHopSession: hopSession !== null,
      hasFocusNode: focusNode !== null
    });
  } catch (error) {
    console.error('Error getting central node state:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get central node state' 
    });
  }
});

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

// Separate endpoint for make_den_main
app.get('/make-den-main', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const denData = await make_den_main(query);
    res.json(denData);
  } catch (error) {
    console.error('Error in /make-den-main:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

app.post('/send-to-den', async (req: Request, res: Response) => {
  try {
    const { url, node } = req.body;

    if (!url || !node) {
      return res.status(400).json({
        error: 'Both url and node are required'
      });
    }

    console.log('🎯 Send-to-den request received!');
    console.log('📤 URL to process:', url);
    console.log('🏠 Den query:', node.query);
    console.log('📊 Den BEFORE processing:');
    console.log('  - Pages:', node.pages, `(length: ${node.pages.length})`);
    console.log('  - Concepts:', node.conceptList, `(length: ${node.conceptList.length})`);

    const result = await sendToDen(url, node);
    
    console.log('📊 Den AFTER processing:');
    console.log('  - Pages:', result.node?.pages, `(length: ${result.node?.pages?.length})`);
    console.log('  - Concepts:', result.node?.conceptList, `(length: ${result.node?.conceptList?.length})`);
    console.log('📈 Processing stats:');
    console.log('  - Concepts added:', result.concepts_added);
    console.log('  - Concepts removed:', result.concepts_removed);
    console.log('  - Child nodes created:', result.child_nodes_created);
    
    // Display comparison scores for child nodes
    if (result.node && 'children' in result.node && result.node.children.length > 0) {
      console.log('🎯 Child node comparison scores:');
      result.node.children.forEach((child, index) => {
        console.log(`  ${index + 1}. "${child.title}": ${child.comparisonScore}/100`);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in /send-to-den:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/get-comparison-score', async (req: Request, res: Response) => {
  try {
    const { string1, string2 } = req.body;

    if (!string1 || !string2) {
      return res.status(400).json({ error: 'Both string1 and string2 are required' });
    }

    const result = await get_comparisonScore(string1, string2);
    res.json(result);
  } catch (error) {
    console.error('Error in /get-comparison-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hop navigation endpoints
app.post('/hop', async (req: Request, res: Response) => {
  try {
    const { query, sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const id = sessionId || `hop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const hopState = await createHopSession(query, id);
    
    res.json({
      success: true,
      sessionId: id,
      hopState,
      currentPage: hopState.pages[0]
    });
  } catch (error) {
    console.error('Error in /hop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hop/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }
    
    const hopState = getHopSession(sessionId);
    
    if (!hopState) {
      return res.status(404).json({ error: 'Hop session not found' });
    }
    
    res.json({
      success: true,
      hopState,
      currentPage: hopState.pages[hopState.currentIndex]
    });
  } catch (error) {
    console.error('Error in /hop/:sessionId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/hop/:sessionId/navigate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { direction } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }

    if (!direction || !['next', 'prev'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "next" or "prev"' });
    }

    const hopState = navigateHop(sessionId, direction);
    
    if (!hopState) {
      return res.status(404).json({ error: 'Hop session not found' });
    }
    
    res.json({
      success: true,
      hopState,
      currentPage: hopState.pages[hopState.currentIndex]
    });
  } catch (error) {
    console.error('Error in /hop/:sessionId/navigate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hop/:sessionId/current', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }
    
    const currentPage = getCurrentPage(sessionId);
    
    if (!currentPage) {
      return res.status(404).json({ error: 'Hop session not found' });
    }
    
    res.json({
      success: true,
      currentPage
    });
  } catch (error) {
    console.error('Error in /hop/:sessionId/current:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hop/:sessionId/pages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }
    
    const pages = getAllPages(sessionId);
    
    if (!pages) {
      return res.status(404).json({ error: 'Hop session not found' });
    }
    
    res.json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('Error in /hop/:sessionId/pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/hop/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }
    
    const deleted = deleteHopSession(sessionId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Hop session not found' });
    }
    
    res.json({
      success: true,
      message: 'Hop session deleted'
    });
  } catch (error) {
    console.error('Error in DELETE /hop/:sessionId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hop-sessions', async (req: Request, res: Response) => {
  try {
    const sessionIds = listActiveSessions();
    res.json({
      success: true,
      sessions: sessionIds
    });
  } catch (error) {
    console.error('Error in /hop-sessions:', error);
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
