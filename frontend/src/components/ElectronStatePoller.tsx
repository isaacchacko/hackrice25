
'use client'

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';

export default function ElectronStatePoller() {
  const { toggleGraphVisibility, clearGraph } = useStore();
  const lastTimestamp = useRef(0);

  useEffect(() => {
    const pollState = async () => {
      try {
        const response = await fetch('../../../electron-state.json');
        const state = await response.json();

        if (state.timestamp > lastTimestamp.current) {
          lastTimestamp.current = state.timestamp;

          if (state.action === 'toggle') {
            console.log('toggling');
            toggleGraphVisibility();
          } else if (state.action === 'clear') {
            console.log('clearing');
            clearGraph();
          }
        }
      } catch (error) {
        // File might not exist yet, ignore error
      }
    };

    const interval = setInterval(pollState, 100); // Poll every 100ms
    return () => clearInterval(interval);
  }, [toggleGraphVisibility, clearGraph]);

  return null;
}
