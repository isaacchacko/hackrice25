// In src/components/search_bar.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import LoadingPage from './loading_page';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const { addNode, nodes } = useStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setShowLoading(true);
    
    // Do ALL the backend work first, then navigate
    try {
      console.log('Starting search:', query);
      
      const searchResponse = await fetch(`http://localhost:4000/search?query=${encodeURIComponent(query)}&limit=10`);
      
      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`);
      }

      const searchResult = await searchResponse.json();

      const hopResponse = await fetch('http://localhost:4000/hop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      if (!hopResponse.ok) {
        throw new Error(`Failed to create hop session: ${hopResponse.status}`);
      }

      const hopData = await hopResponse.json();

      // Create node immediately
      const newNode = {
        id: `node-${nodes.length + 1}`,
        data: { 
          label: query,
          type: 'search',
          denData: searchResult.centralNode,
          hopSessionId: hopData.sessionId,
          hopData: hopData.hopState
        },
        position: {
          x: Math.random() * 400 - 200,
          y: Math.random() * 400 - 200
        },
        style: {
          background: '#db2777',
          color: '#fff',
          border: '2px solid #fff',
          width: 100,
          height: 100,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
          padding: '5px'
        }
      };

      addNode(newNode);
      console.log('Node added to store');

      // NOW navigate - this will change the entire Electron window
      setIsNavigating(true);
      const firstPageUrl = hopData.currentPage.url;
      const denDataParam = encodeURIComponent(JSON.stringify(searchResult.centralNode));
      
      await fetch(`http://localhost:4400/url?to=${encodeURIComponent(firstPageUrl)}&hopSessionId=${hopData.sessionId}&denData=${denDataParam}`);
      
      // Don't set loading to false - the page will change and this component will unmount

    } catch (error) {
      console.error('Error in search:', error);
      
      try {
        const res = await fetch(`http://localhost:4000/search?query=${encodeURIComponent(query)}`);
        const urlToSend = await res.json();
        if (urlToSend && urlToSend.length > 0) {
          setIsNavigating(true);
          await fetch(`http://localhost:4400/url?to=${encodeURIComponent(urlToSend[0].url)}`);
          // Don't set loading to false here either
        } else {
          setShowLoading(false); // Only hide loading if we failed completely
        }
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError);
        setShowLoading(false);
      }
    }
  };

  // If we're navigating, keep showing loading indefinitely
  if (showLoading || isNavigating) {
    return (
      <LoadingPage 
        onComplete={() => {}} // Don't auto-complete
        message="Loading your results..."
        duration={99999} // Effectively infinite
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="How do planes fly?"
        className="flex-grow p-4 rounded-l-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <button
        type="submit"
        className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-8 rounded-r-md text-lg"
      >
        Search
      </button>
    </form>
  );
}