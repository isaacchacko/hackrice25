// backend/src/services/search.ts
import dotenv from 'dotenv';
import { get_answer } from './get_answer.js';
import { burrow } from './burrow.js';
import { sendToDen } from './send_toDen.js';
// Load environment variables
dotenv.config({ path: '../.env' });
// Global state management for the central knowledge graph
let centralBigDaddyNode = null;
let currentHopSession = null;
let currentFocusNode = null;
// Add these functions to search.ts
export function clearCentralBigDaddyNode() {
    centralBigDaddyNode = null;
    currentFocusNode = null;
    currentHopSession = null;
    console.log('🧹 Cleared all central node state');
}
// Function to clear all memory and reset state
export function clearAllMemory() {
    centralBigDaddyNode = null;
    currentFocusNode = null;
    currentHopSession = null;
    console.log('🧹 Cleared all memory and reset state');
}
export async function resetCentralNodeForNewSearch(query, pages) {
    console.log('🔄 Resetting central node for new search:', query);
    clearCentralBigDaddyNode();
    return await createCentralBigDaddyNode(query, pages);
}
// Global state getters and setters
export function getCentralBigDaddyNode() {
    return centralBigDaddyNode;
}
export function setCentralBigDaddyNode(node) {
    centralBigDaddyNode = node;
    // When setting the central node, also set it as the focus node
    currentFocusNode = node;
    console.log('🏠 Central bigDaddyNode set:', node?.query || 'null');
    console.log('🎯 Focus node set to central bigDaddyNode');
}
export function getCurrentHopSession() {
    return currentHopSession;
}
export function setCurrentHopSession(sessionId) {
    currentHopSession = sessionId;
    console.log('🎯 Hop session set:', sessionId || 'null');
}
export function getCurrentFocusNode() {
    return currentFocusNode;
}
export function setCurrentFocusNode(node) {
    currentFocusNode = node;
    console.log('🎯 Focus node set:', node?.query || 'null');
}
// Function to update the central node when focus node is updated
export function updateCentralNodeFromFocusNode() {
    if (currentFocusNode && centralBigDaddyNode) {
        // If the focus node is the central node, update it
        if (currentFocusNode === centralBigDaddyNode) {
            centralBigDaddyNode = currentFocusNode;
            console.log('🏠 Central node updated from focus node');
        }
        // If the focus node is a child of the central node, update the central node's children
        else if (centralBigDaddyNode.children && currentFocusNode && 'title' in currentFocusNode) {
            const childIndex = centralBigDaddyNode.children.findIndex(child => child.title === currentFocusNode.title);
            if (childIndex !== -1) {
                centralBigDaddyNode.children[childIndex] = currentFocusNode;
                console.log('🏠 Updated child node in central node:', currentFocusNode.title);
            }
        }
    }
}
// Function to create a new central bigDaddyNode from search results
export async function createCentralBigDaddyNode(query, pages) {
    const bigDaddyNode = {
        query: query,
        pages: pages.map(page => page.url),
        denPages: [], // Pages added via Ctrl+D (den operations)
        conceptList: [], // Will be populated by other services
        children: [], // Will be populated by other services
        answer: `This is a knowledge graph about "${query}". The answer will be generated as more content is added to this node.` // Initial placeholder answer
    };
    setCentralBigDaddyNode(bigDaddyNode);
    // Don't generate initial answer - wait for den pages to be added
    console.log('📝 Initial answer will be generated when pages are added to the den');
    return bigDaddyNode;
}
// Function to get or create the central bigDaddyNode
export async function getOrCreateCentralBigDaddyNode(query, pages) {
    if (centralBigDaddyNode) {
        console.log('🏠 Using existing central bigDaddyNode:', centralBigDaddyNode.query);
        return centralBigDaddyNode;
    }
    console.log('🏠 Creating new central bigDaddyNode for query:', query);
    return await createCentralBigDaddyNode(query, pages);
}
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_CX;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
export async function search(query, opts = {}) {
    const q = query.trim();
    if (!q)
        throw new Error("search(): query is empty");
    const siteFilter = opts.site && opts.site.length ? " " + opts.site.map((s) => `site:${s}`).join(" OR ") : "";
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
    throw new Error("search(): No search provider configured. Set GOOGLE_API_KEY + GOOGLE_CSE_ID or SERPER_API_KEY");
}
// Enhanced search function that creates and manages the central bigDaddyNode
// In search.ts, modify this function:
export async function searchWithCentralNode(query, opts = {}) {
    console.log('🔍 Starting enhanced search with central node management');
    // Perform the search
    const pages = await search(query, opts);
    console.log(`📄 Found ${pages.length} search results`);
    // ✅ ALWAYS create a fresh central node for new searches
    const centralNode = await resetCentralNodeForNewSearch(query, pages);
    // Generate a hop session ID
    const hopSessionId = `hop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentHopSession(hopSessionId);
    console.log('✅ Enhanced search completed with fresh central node:');
    console.log('  - Query:', centralNode.query);
    console.log('  - Pages:', centralNode.pages.length);
    console.log('  - Hop Session:', hopSessionId);
    return {
        pages,
        centralNode,
        hopSessionId
    };
}
async function googleCSE(query, opts) {
    const pages = [];
    const seen = new Set();
    let fetched = 0;
    let start = 1;
    while (fetched < opts.limit) {
        const pageSize = Math.min(10, opts.limit - fetched);
        const url = new URL("https://www.googleapis.com/customsearch/v1");
        url.searchParams.set("key", GOOGLE_API_KEY);
        url.searchParams.set("cx", GOOGLE_CSE_ID);
        url.searchParams.set("q", query);
        url.searchParams.set("num", String(pageSize));
        url.searchParams.set("start", String(start));
        url.searchParams.set("safe", opts.safe === "active" ? "active" : "off");
        if (opts.lang)
            url.searchParams.set("lr", opts.lang); // only when defined
        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) {
            const text = await safeText(res);
            throw new Error(`googleCSE(): ${res.status} ${res.statusText} — ${text}`);
        }
        const data = (await res.json());
        const items = (data.items ?? []);
        if (!items.length)
            break;
        for (const it of items) {
            const link = (it.link ?? "").trim();
            if (!link || seen.has(link))
                continue;
            seen.add(link);
            const page = { url: link };
            pages.push(page);
            fetched++;
            if (fetched >= opts.limit)
                break;
        }
        start += items.length;
        if (items.length < pageSize)
            break;
    }
    return pages;
}
async function serper(query, opts) {
    const body = {
        q: query,
        num: Math.min(opts.limit, 20),
        safesearch: opts.safe === "active",
        gl: "us",
        hl: opts.lang ? opts.lang.replace(/^lang_/, "") : "en",
    };
    const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`serper(): ${res.status} ${res.statusText} — ${text}`);
    }
    const data = (await res.json());
    const organic = (data.organic ?? []);
    const pages = [];
    const seen = new Set();
    for (const it of organic) {
        const link = (it.link ?? "").trim();
        if (!link || seen.has(link))
            continue;
        seen.add(link);
        const page = { url: link };
        pages.push(page);
        if (pages.length >= opts.limit)
            break;
    }
    return pages;
}
// ---------------- Utilities ----------------
async function safeText(res) {
    try {
        return await res.text();
    }
    catch {
        return "";
    }
}
/**
 * Burrows into a child node by setting it as a den and adding new child concepts
 * @param centralNode - The central bigDaddyNode containing the child to burrow into
 * @param childTitle - The title of the child node to burrow into
 * @returns Promise containing the updated central node or error information
 */
export async function burrowIntoChildNode(centralNode, childTitle) {
    try {
        console.log(`🔍 Burrowing into child node: "${childTitle}"`);
        // Find the child node by title
        const childNode = centralNode.children.find(child => child.title === childTitle);
        if (!childNode) {
            return {
                success: false,
                error: `Child node with title "${childTitle}" not found`
            };
        }
        console.log(`✅ Found child node: "${childNode.title}"`);
        // Set the child node as a den (isDen = true)
        childNode.isDen = true;
        console.log(`🏠 Set "${childNode.title}" as a den (isDen = true)`);
        // Search for pages related to the child's title using burrow
        console.log(`🔍 Searching for content related to "${childTitle}"...`);
        const burrowPages = await burrow(childTitle, { limit: 5 });
        if (burrowPages.length === 0) {
            console.log(`⚠️ No pages found for "${childTitle}"`);
            return {
                success: true,
                centralNode,
                childNode,
                newChildrenCount: 0
            };
        }
        console.log(`📄 Found ${burrowPages.length} pages for "${childTitle}"`);
        // Process each page and add concepts as children to the burrowed node
        let newChildrenCount = 0;
        for (const page of burrowPages) {
            console.log(`🔄 Processing page: ${page.url}`);
            // Use sendToDen to process the page and add concepts as children
            const result = await sendToDen(page.url, childNode);
            if (result.success && result.child_nodes_created) {
                newChildrenCount += result.child_nodes_created;
                console.log(`✅ Added ${result.child_nodes_created} child nodes to "${childTitle}"`);
            }
            else {
                console.warn(`⚠️ Failed to process page ${page.url}: ${result.error}`);
            }
        }
        console.log(`🎉 Burrowing complete! Added ${newChildrenCount} new child nodes to "${childTitle}"`);
        return {
            success: true,
            centralNode,
            childNode,
            newChildrenCount
        };
    }
    catch (error) {
        console.error('❌ Error in burrowIntoChildNode:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
//# sourceMappingURL=search.js.map