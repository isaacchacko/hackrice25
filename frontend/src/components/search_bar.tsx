// In src/components/SearchBar.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const { addNode, nodes } = useStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;


    // Original search functionality - opens link automatically
    const res = await fetch(`http://localhost:4000/search?query="${query}"`);
    const urlToSend = await res.json();
    console.log(urlToSend);
    if (!urlToSend || urlToSend.length === 0) {
      console.log("failed out no results");
      return;
    };
    await fetch(`http://localhost:4400/url?to=${urlToSend[0].url}`)
    console.log('ran', urlToSend[0].url);

    // ONLY ADD: Create den for this search query

    try {
      console.log('🎯 Creating hop session for search query:', query);
      
      // Create hop session with 10 search results
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
      console.log('✅ Hop session created successfully!');
      console.log('📊 Hop session details:');
      console.log('  - Session ID:', hopData.sessionId);
      console.log('  - Query:', hopData.hopState.query);
      console.log('  - Total pages:', hopData.hopState.pages.length);
      console.log('  - Current page:', hopData.currentPage.url);

      // Create den for this search query first
      let searchDenData = null;
      try {
        console.log('🏠 Creating den for search query:', query);
        const denResponse = await fetch(`http://localhost:4000/make-den-main?query=${encodeURIComponent(query)}`);
        if (denResponse.ok) {
          searchDenData = await denResponse.json();
          console.log('🏠 Den created successfully:', searchDenData);
          console.log('🏠 Den data structure:', {
            query: searchDenData.query,
            pages: searchDenData.pages,
            conceptList: searchDenData.conceptList,
            children: searchDenData.children
          });
        }
      } catch (denError) {
        console.error('❌ Failed to create den:', denError);
      }

      // Open the first page in the hop session
      const firstPageUrl = hopData.currentPage.url;
      const denDataParam = searchDenData ? encodeURIComponent(JSON.stringify(searchDenData)) : '';
      await fetch(`http://localhost:4400/url?to=${firstPageUrl}&hopSessionId=${hopData.sessionId}&denData=${denDataParam}`);
      console.log('🌐 Opened first page:', firstPageUrl);
      console.log('🎯 Set hop session ID:', hopData.sessionId);
      console.log('🏠 Set den data for query:', searchDenData?.query);

      // Create node with both hop and den data
      const newNode = {
        id: `node-${nodes.length + 1}`,
        data: { 
          label: query,
          type: 'search',
          denData: searchDenData,
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

      console.log('📦 Creating node with data:', newNode.data);
      addNode(newNode);
      console.log('✅ Node added to store');
      console.log('🎮 Use Ctrl+Left/Right arrows to navigate between search results!');

    } catch (error) {
      console.error('❌ Error creating hop session:', error);
      
      // Fallback to original search functionality
      console.log('🔄 Falling back to original search...');
      const res = await fetch(`http://localhost:4000/search?query="${query}"`);
      const urlToSend = await res.json();
      await fetch(`http://localhost:4400/url?to=${urlToSend[0].url}`);
      console.log('ran', urlToSend[0].url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="How do planes fly?"
        className="flex-grow p-3 rounded-l-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <button
        type="submit"
        className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-r-md"
      >
        Search
      </button>
    </form>
  );
}
