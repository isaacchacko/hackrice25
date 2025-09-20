// In src/components/SearchBar.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { url } from 'inspector';

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
    await fetch(`http://localhost:4400/url?to=${urlToSend[0].url}`)
    console.log('ran', urlToSend[0].url);

    // ONLY ADD: Create den for this search query
    try {
      console.log('🏠 Creating den for search query:', query);
      const denResponse = await fetch(`http://localhost:4000/make-den-main?query=${encodeURIComponent(query)}`);
      if (denResponse.ok) {
        const denData = await denResponse.json();
        console.log('🏠 Den created successfully:', denData);
      }
    } catch (denError) {
      console.error('❌ Failed to create den:', denError);
    }

    // Original node creation
    const newNode = {
      id: `node-${nodes.length + 1}`,
      data: { label: query },
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
