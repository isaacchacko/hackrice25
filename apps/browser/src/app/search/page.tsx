// In src/app/search/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  return (
    <div>
      <Link href="/" className="text-pink-400 hover:underline mb-6 block">&larr; New Search</Link>
      <h1 className="text-3xl font-bold mb-4">
        Results for: <span className="text-pink-500">{query}</span>
      </h1>
      {/* Results will go here */}
    </div>
  );
}