// In src/components/GlobalKeyListener.tsx
'use client';
import { useEffect } from 'react';
import { useStore } from '@/store';

export default function GlobalKeyListener() {
  const { toggleGraphVisibility } = useStore();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Check if the user is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return; // If so, do nothing and exit the function
      }
      
      // 2. Check if the pressed key is 'g'
      if (event.key === 'g') { 
        event.preventDefault();
        toggleGraphVisibility();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleGraphVisibility]);
  
  return null;
}