// In src/components/SearchBar.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const { addNode, nodes } = useStore();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // new node
    const newNode = {
      id: `node-${nodes.length + 1}`, // Create a simple unique ID
      data: { label: query },
      position: {
        x: Math.random() * 400 - 200, // Randomize position to avoid overlap
        y: Math.random() * 400 - 200
      },
      style: {
        background: '#db2777', // A pink background
        color: '#fff', // White text
        border: '2px solid #fff',
        width: 100,
        height: 100,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5px'
      }
    };

    // 2. Call the addNode function to add it to the graph
    addNode(newNode);
    router.push(`/search?q=${encodeURIComponent(query)}`);
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
        onClick={() => window.electronAPI.send('custom-channel', { message: 'Hello from Next.js & TypeScript!' })}
      >
        Search
      </button>
    </form >
  );
}
