// backend/src/services/burrow_session.ts
import { burrow } from './burrow.js';
import type { Page } from './search.js';

export type BurrowSession = {
  childTitle: string;
  pages: Page[];
  currentIndex: number;
  createdAt: Date;
  childNodeId: string; // Reference to the child node being burrowed into
};

// Global state to store burrow sessions
const burrowSessions = new Map<string, BurrowSession>();

export async function createBurrowSession(childTitle: string, childNodeId: string): Promise<BurrowSession> {
  console.log(`🕳️ Creating burrow session for child: "${childTitle}"`);
  
  try {
    // Get 10 search results for the child concept
    const pages = await burrow(childTitle, { limit: 10 });
    console.log(`🔍 Found ${pages.length} search results for burrow session`);
    
    const burrowState: BurrowSession = {
      childTitle,
      pages,
      currentIndex: 0,
      createdAt: new Date(),
      childNodeId
    };
    
    burrowSessions.set(childNodeId, burrowState);
    console.log(`✅ Burrow session created for child: ${childTitle}`);
    console.log(`📊 Burrow session details:`);
    console.log(`  - Child: "${childTitle}"`);
    console.log(`  - Pages: ${pages.length} results`);
    console.log(`  - Current index: 0`);
    console.log(`  - First page: ${pages[0]?.url || 'None'}`);
    
    return burrowState;
  } catch (error) {
    console.error(`❌ Failed to create burrow session for child "${childTitle}":`, error);
    throw error;
  }
}

export function getBurrowSession(childNodeId: string): BurrowSession | null {
  const session = burrowSessions.get(childNodeId);
  if (!session) {
    console.log(`❌ Burrow session not found: ${childNodeId}`);
    return null;
  }
  return session;
}

export function navigateBurrow(childNodeId: string, direction: 'next' | 'prev'): BurrowSession | null {
  const session = burrowSessions.get(childNodeId);
  if (!session) {
    console.log(`❌ Cannot navigate: burrow session not found: ${childNodeId}`);
    return null;
  }
  
  const oldIndex = session.currentIndex;
  const totalPages = session.pages.length;
  
  if (direction === 'next') {
    session.currentIndex = (session.currentIndex + 1) % totalPages;
  } else {
    session.currentIndex = session.currentIndex === 0 ? totalPages - 1 : session.currentIndex - 1;
  }
  
  const newIndex = session.currentIndex;
  const currentUrl = session.pages[newIndex]?.url || 'None';
  
  console.log(`🔄 Burrow navigation: ${direction}`);
  console.log(`  - Child: "${session.childTitle}"`);
  console.log(`  - Index: ${oldIndex} → ${newIndex}`);
  console.log(`  - Total pages: ${totalPages}`);
  console.log(`  - Current URL: ${currentUrl}`);
  
  return session;
}

export function getCurrentBurrowPage(childNodeId: string): Page | null {
  const session = burrowSessions.get(childNodeId);
  if (!session) {
    console.log(`❌ Burrow session not found: ${childNodeId}`);
    return null;
  }
  
  return session.pages[session.currentIndex] || null;
}

export function getAllBurrowPages(childNodeId: string): Page[] | null {
  const session = burrowSessions.get(childNodeId);
  if (!session) {
    console.log(`❌ Burrow session not found: ${childNodeId}`);
    return null;
  }
  
  return session.pages;
}

export function deleteBurrowSession(childNodeId: string): boolean {
  const deleted = burrowSessions.delete(childNodeId);
  if (deleted) {
    console.log(`✅ Burrow session deleted: ${childNodeId}`);
  } else {
    console.log(`❌ Burrow session not found for deletion: ${childNodeId}`);
  }
  return deleted;
}

export function listActiveBurrowSessions(): string[] {
  return Array.from(burrowSessions.keys());
}
