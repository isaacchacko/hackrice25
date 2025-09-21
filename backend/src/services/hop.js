// backend/src/services/hop.ts
import { search } from './search.js';
// Global state to store hop sessions
// In a real app, you'd want to use a database or Redis
const hopSessions = new Map();
export async function createHopSession(query, sessionId) {
    console.log(`🎯 Creating hop session for query: "${query}"`);
    try {
        // Get 10 search results
        const pages = await search(query, { limit: 10 });
        console.log(`🔍 Found ${pages.length} search results for hop session`);
        const hopState = {
            query,
            pages,
            currentIndex: 0,
            createdAt: new Date()
        };
        hopSessions.set(sessionId, hopState);
        console.log(`✅ Hop session created with ID: ${sessionId}`);
        console.log(`📊 Hop session details:`);
        console.log(`  - Query: "${query}"`);
        console.log(`  - Pages: ${pages.length} results`);
        console.log(`  - Current index: 0`);
        console.log(`  - First page: ${pages[0]?.url || 'None'}`);
        return hopState;
    }
    catch (error) {
        console.error(`❌ Failed to create hop session for query "${query}":`, error);
        throw error;
    }
}
export function getHopSession(sessionId) {
    const session = hopSessions.get(sessionId);
    if (session) {
        console.log(`📖 Retrieved hop session: ${sessionId}`);
        console.log(`  - Query: "${session.query}"`);
        console.log(`  - Current index: ${session.currentIndex}/${session.pages.length - 1}`);
        console.log(`  - Current URL: ${session.pages[session.currentIndex]?.url || 'None'}`);
        return session;
    }
    else {
        console.log(`❌ Hop session not found: ${sessionId}`);
        return null;
    }
}
export function navigateHop(sessionId, direction) {
    const session = hopSessions.get(sessionId);
    if (!session) {
        console.log(`❌ Cannot navigate: hop session not found: ${sessionId}`);
        return null;
    }
    const oldIndex = session.currentIndex;
    const totalPages = session.pages.length;
    if (direction === 'next') {
        session.currentIndex = (session.currentIndex + 1) % totalPages;
    }
    else {
        session.currentIndex = session.currentIndex === 0 ? totalPages - 1 : session.currentIndex - 1;
    }
    const newIndex = session.currentIndex;
    const currentUrl = session.pages[newIndex]?.url || 'None';
    console.log(`🔄 Hop navigation: ${direction}`);
    console.log(`  - Session: ${sessionId}`);
    console.log(`  - Query: "${session.query}"`);
    console.log(`  - Index: ${oldIndex} → ${newIndex}`);
    console.log(`  - Total pages: ${totalPages}`);
    console.log(`  - Current URL: ${currentUrl}`);
    return session;
}
export function getCurrentPage(sessionId) {
    const session = hopSessions.get(sessionId);
    if (!session) {
        console.log(`❌ Cannot get current page: hop session not found: ${sessionId}`);
        return null;
    }
    const currentPage = session.pages[session.currentIndex];
    console.log(`📍 Current page for session ${sessionId}:`);
    console.log(`  - Index: ${session.currentIndex}/${session.pages.length - 1}`);
    console.log(`  - URL: ${currentPage?.url || 'None'}`);
    console.log(`  - Title: ${currentPage?.title || 'Untitled'}`);
    return currentPage || null;
}
export function getAllPages(sessionId) {
    const session = hopSessions.get(sessionId);
    if (!session) {
        console.log(`❌ Cannot get pages: hop session not found: ${sessionId}`);
        return null;
    }
    console.log(`📋 All pages for session ${sessionId}:`);
    session.pages.forEach((page, index) => {
        const isCurrent = index === session.currentIndex;
        console.log(`  ${index + 1}. ${isCurrent ? '→ ' : '  '}${page.url} ${isCurrent ? '(CURRENT)' : ''}`);
    });
    return session.pages;
}
export function deleteHopSession(sessionId) {
    const deleted = hopSessions.delete(sessionId);
    if (deleted) {
        console.log(`🗑️ Deleted hop session: ${sessionId}`);
    }
    else {
        console.log(`❌ Failed to delete hop session (not found): ${sessionId}`);
    }
    return deleted;
}
export function listActiveSessions() {
    const sessionIds = Array.from(hopSessions.keys());
    console.log(`📊 Active hop sessions: ${sessionIds.length}`);
    sessionIds.forEach(id => {
        const session = hopSessions.get(id);
        if (session) {
            console.log(`  - ${id}: "${session.query}" (${session.pages.length} pages, index ${session.currentIndex})`);
        }
    });
    return sessionIds;
}
//# sourceMappingURL=hop.js.map