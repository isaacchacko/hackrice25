// In src/components/ClientLayoutWrapper.tsx
"use client";

import { useStore } from "@/store";
import { GlobalKeyListener } from "@/components/globalkeylistener";

// STEP 1: Import 'dynamic'
import dynamic from 'next/dynamic';

// STEP 2: Dynamically import SearchGraph and disable Server-Side Rendering (SSR) for it
const SearchGraph = dynamic(() => import('@/components/search_graph'), {
  ssr: false, 
  loading: () => <p>Loading Graph...</p> // Optional: show a loading message
});

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isGraphVisible } = useStore();

  return (
    <>
      {/* STEP 3: You can now safely uncomment these lines */}
      <GlobalKeyListener />
      
      <div className="bg-slate-900 min-h-screen text-slate-100">
        <main className="max-w-4xl mx-auto p-4">{children}</main>
      </div>
      
      {isGraphVisible && <SearchGraph />}
    </>
  );
}