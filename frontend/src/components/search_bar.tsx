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

    try {
      console.log('🔍 Starting enhanced search with central node management:', query);
      
      // Use the new enhanced search function that creates central node and hop session
      const searchResponse = await fetch(`http://localhost:4000/search?query=${encodeURIComponent(query)}&limit=10`);
      
      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status}`);
      }

      const searchResult = await searchResponse.json();
      console.log('✅ Enhanced search completed successfully!');
      console.log('📊 Search result details:');
      console.log('  - Pages found:', searchResult.pages.length);
      console.log('  - Central node query:', searchResult.centralNode.query);
      console.log('  - Hop session ID:', searchResult.hopSessionId);
      console.log('  - Central node pages:', searchResult.centralNode.pages.length);

      // Create a hop session for navigation (still needed for the hop functionality)
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
      console.log('✅ Hop session created for navigation');

      // Open the first page in the hop session
      const firstPageUrl = hopData.currentPage.url;
      const denDataParam = encodeURIComponent(JSON.stringify(searchResult.centralNode));
      await fetch(`http://localhost:4400/url?to=${encodeURIComponent(firstPageUrl)}&hopSessionId=${hopData.sessionId}&denData=${denDataParam}`);
      console.log('🌐 Opened first page:', firstPageUrl);
      console.log('🎯 Set hop session ID:', hopData.sessionId);
      console.log('🏠 Set central node for query:', searchResult.centralNode.query);

      // Create node with both hop and central node data
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

      console.log('📦 Creating node with data:', newNode.data);
      addNode(newNode);
      console.log('✅ Node added to store');
      console.log('🎮 Use Ctrl+Left/Right arrows to navigate between search results!');

    } catch (error) {
      console.error('❌ Error creating hop session:', error);
      
      // Fallback to original search functionality
      console.log('🔄 Falling back to original search...');
      const res = await fetch(`http://localhost:4000/search?query=${encodeURIComponent(query)}`);
      const urlToSend = await res.json();
      if (urlToSend && urlToSend.length > 0) {
        await fetch(`http://localhost:4400/url?to=${encodeURIComponent(urlToSend[0].url)}`);
        console.log('ran', urlToSend[0].url);
      } else {
        console.log("No search results found");
      }
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
