// In src/components/GlobalKeyListener.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

export default function GlobalKeyListener() {
  const router = useRouter();
  // Get both functions from the store
  const { toggleGraphVisibility, clearGraph } = useStore(); 
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      
      console.log('🎹 Key pressed:', event.key, 'Alt:', event.altKey, 'Ctrl:', event.ctrlKey);
      
      // Check for Alt+G to open knowledge graph
      if (event.altKey && event.key === 'g') {
        event.preventDefault();
        console.log('🕸️ Alt+G pressed - opening knowledge graph');
        router.push('/graph');
      }
      // Check for the 'g' key to toggle visibility (legacy)
      else if (event.key === 'g' && !event.altKey) { 
        event.preventDefault();
        toggleGraphVisibility();
      } 
      // Check for the 'h' key to clear the graph
      else if (event.key === 'h') { 
        event.preventDefault();
        clearGraph();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleGraphVisibility, clearGraph, router]); // <-- Add router to the dependency array
  
  return null;
}