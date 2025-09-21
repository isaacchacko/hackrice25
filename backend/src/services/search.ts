// backend/src/services/search.ts
import dotenv from 'dotenv';
import type { bigDaddyNode, concept } from '../types/den.js';

// Load environment variables
dotenv.config({ path: '../.env' });

// Global state management for the central knowledge graph
let centralBigDaddyNode: bigDaddyNode | null = null;
let currentHopSession: string | null = null;
let currentFocusNode: bigDaddyNode | null = null;

// Global state getters and setters
export function getCentralBigDaddyNode(): bigDaddyNode | null {
  return centralBigDaddyNode;
}

export function setCentralBigDaddyNode(node: bigDaddyNode | null): void {
  centralBigDaddyNode = node;
  // When setting the central node, also set it as the focus node
  currentFocusNode = node;
  console.log('🏠 Central bigDaddyNode set:', node?.query || 'null');
  console.log('🎯 Focus node set to central bigDaddyNode');
}

export function getCurrentHopSession(): string | null {
  return currentHopSession;
}

export function setCurrentHopSession(sessionId: string | null): void {
  currentHopSession = sessionId;
  console.log('🎯 Hop session set:', sessionId || 'null');
}

export function getCurrentFocusNode(): bigDaddyNode | null {
  return currentFocusNode;
}

export function setCurrentFocusNode(node: bigDaddyNode | null): void {
  currentFocusNode = node;
  console.log('🎯 Focus node set:', node?.query || 'null');
}

// Function to create a new central bigDaddyNode from search results
export function createCentralBigDaddyNode(query: string, pages: Page[]): bigDaddyNode {
  const bigDaddyNode: bigDaddyNode = {
    query: query,
    pages: pages.map(page => page.url),
    conceptList: [], // Will be populated by other services
    children: [], // Will be populated by other services
    answer: "" // Will be populated by other services
  };
  
  setCentralBigDaddyNode(bigDaddyNode);
  return bigDaddyNode;
}

// Function to get or create the central bigDaddyNode
export function getOrCreateCentralBigDaddyNode(query: string, pages: Page[]): bigDaddyNode {
  if (centralBigDaddyNode) {
    console.log('🏠 Using existing central bigDaddyNode:', centralBigDaddyNode.query);
    return centralBigDaddyNode;
  }
  
  console.log('🏠 Creating new central bigDaddyNode for query:', query);
  return createCentralBigDaddyNode(query, pages);
}

export type Page = {
  url: string;
  title?: string;            // we will omit if undefined
  snippet?: string;          // we will omit if undefined
};

export type SearchOptions = {
  limit?: number;
  lang?: string;
  safe?: "off" | "active";
  site?: string[];
};

const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_CSE_API_KEY;

const GOOGLE_CSE_ID =
  process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_CX;

const SERPER_API_KEY = process.env.SERPER_API_KEY;


export async function search(query: string, opts: SearchOptions = {}): Promise<Page[]> {
  const q = query.trim();
  if (!q) throw new Error("search(): query is empty");

  const siteFilter =
    opts.site && opts.site.length ? " " + opts.site.map((s) => `site:${s}`).join(" OR ") : "";

  const fullQuery = q + siteFilter;
  const limit = Math.max(1, Math.min(50, opts.limit ?? 10));
  const safe = opts.safe ?? "active";

  if (GOOGLE_API_KEY && GOOGLE_CSE_ID) {
    return await googleCSE(fullQuery, {
      limit,
      safe,
      ...(opts.lang ? { lang: opts.lang } : {}), // omit when undefined
    });
  }
  if (SERPER_API_KEY) {
    return await serper(fullQuery, {
      limit,
      safe,
      ...(opts.lang ? { lang: opts.lang } : {}), // omit when undefined
    });
  }
  throw new Error(
    "search(): No search provider configured. Set GOOGLE_API_KEY + GOOGLE_CSE_ID or SERPER_API_KEY",
  );
}

// Enhanced search function that creates and manages the central bigDaddyNode
export async function searchWithCentralNode(query: string, opts: SearchOptions = {}): Promise<{
  pages: Page[];
  centralNode: bigDaddyNode;
  hopSessionId: string;
}> {
  console.log('🔍 Starting enhanced search with central node management');
  
  // Perform the search
  const pages = await search(query, opts);
  console.log(`📄 Found ${pages.length} search results`);
  
  // Create or get the central bigDaddyNode
  const centralNode = getOrCreateCentralBigDaddyNode(query, pages);
  
  // Generate a hop session ID (simple timestamp-based for now)
  const hopSessionId = `hop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  setCurrentHopSession(hopSessionId);
  
  console.log('✅ Enhanced search completed:');
  console.log('  - Query:', centralNode.query);
  console.log('  - Pages:', centralNode.pages.length);
  console.log('  - Hop Session:', hopSessionId);
  console.log('  - Focus Node:', currentFocusNode?.query || 'null');
  
  return {
    pages,
    centralNode,
    hopSessionId
  };
}

// ---------------- Google CSE ----------------

type GoogleCSEOpts = {
  limit: number;
  safe: "off" | "active";
  lang?: string; // we never pass undefined explicitly
};

async function googleCSE(query: string, opts: GoogleCSEOpts): Promise<Page[]> {
  const pages: Page[] = [];
  const seen = new Set<string>();
  let fetched = 0;
  let start = 1;

  while (fetched < opts.limit) {
    const pageSize = Math.min(10, opts.limit - fetched);
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_API_KEY!);
    url.searchParams.set("cx", GOOGLE_CSE_ID!);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(pageSize));
    url.searchParams.set("start", String(start));
    url.searchParams.set("safe", opts.safe === "active" ? "active" : "off");
    if (opts.lang) url.searchParams.set("lr", opts.lang); // only when defined

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`googleCSE(): ${res.status} ${res.statusText} — ${text}`);
    }

    const data = (await res.json()) as any;
    const items = (data.items ?? []) as any[];
    if (!items.length) break;

    for (const it of items) {
      const link = (it.link ?? "").trim();
      if (!link || seen.has(link)) continue;
      seen.add(link);

      const page: Page = { url: link };
      pages.push(page);
      fetched++;
      if (fetched >= opts.limit) break;
    }

    start += items.length;
    if (items.length < pageSize) break;
  }

  return pages;
}

// ---------------- Serper.dev fallback ----------------

type SerperOpts = {
  limit: number;
  safe: "off" | "active";
  lang?: string;
};

async function serper(query: string, opts: SerperOpts): Promise<Page[]> {
  const body: Record<string, unknown> = {
    q: query,
    num: Math.min(opts.limit, 20),
    safesearch: opts.safe === "active",
    gl: "us",
    hl: opts.lang ? opts.lang.replace(/^lang_/, "") : "en",
  };

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`serper(): ${res.status} ${res.statusText} — ${text}`);
  }

  const data = (await res.json()) as any;
  const organic = (data.organic ?? []) as any[];
  const pages: Page[] = [];
  const seen = new Set<string>();

  for (const it of organic) {
    const link = (it.link ?? "").trim();
    if (!link || seen.has(link)) continue;
    seen.add(link);

    const page: Page = { url: link };
    pages.push(page);
    if (pages.length >= opts.limit) break;
  }

  return pages;
}

// ---------------- Utilities ----------------

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
