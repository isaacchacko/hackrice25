// In src/components/GlobalKeyListener.tsx
'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export function GlobalKeyListener() {
  const { toggleGraphVisibility } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle when the backtick ` key is pressed
      if (event.key === 'g') {
        event.preventDefault(); // Prevent typing the character in an input
        toggleGraphVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleGraphVisibility]);

  return null; // This component renders nothing
}