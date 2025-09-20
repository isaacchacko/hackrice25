// In src/components/GlobalKeyListener.tsx
'use client';
import { useEffect } from 'react';
import { useStore } from '@/store';

export default function GlobalKeyListener() {
  // Get both functions from the store
  const { toggleGraphVisibility, clearGraph } = useStore(); 
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      
      // Check for the 'g' key to toggle visibility
      if (event.key === 'g') { 
        event.preventDefault();
        toggleGraphVisibility();
      } 
      // Check for the 'Escape' key to clear the graph
      else if (event.key === 'h') { 
        event.preventDefault();
        clearGraph();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleGraphVisibility, clearGraph]); // <-- Add clearGraph to the dependency array
  
  return null;
}