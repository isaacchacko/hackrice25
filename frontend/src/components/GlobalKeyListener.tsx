// In src/components/GlobalKeyListener.tsx
'use client';
import { useEffect } from 'react';
import { useStore } from '@/store';

// Make sure you have "export default" here
export default function GlobalKeyListener() {
  const { toggleGraphVisibility } = useStore();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
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