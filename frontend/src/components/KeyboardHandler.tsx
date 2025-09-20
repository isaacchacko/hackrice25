'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export default function KeyboardHandler() {
  const { nodes } = useStore();

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check for Ctrl+D
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        
        // Get the current page URL
        const currentUrl = window.location.href;
        console.log('🎯 Ctrl+D pressed! Current URL:', currentUrl);
        
        // Find the most recent search node (the one with denData)
        const searchNodes = nodes.filter(node => 
          node.data.type === 'search' && node.data.denData
        );
        
        if (searchNodes.length === 0) {
          console.log('❌ No search nodes with den data found');
          alert('No search den found. Please perform a search first.');
          return;
        }
        
        // Get the most recent search node
        const latestSearchNode = searchNodes[searchNodes.length - 1];
        console.log('🏠 Found search node:', latestSearchNode);
        
        try {
          // Send the current page to the den
          console.log('📤 Sending page to den...');
          const response = await fetch('http://localhost:4000/send-to-den', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: currentUrl,
              node: latestSearchNode
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to send to den: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('✅ Page sent to den successfully:', result);
          alert('Page sent to den successfully!');
          
        } catch (error) {
          console.error('❌ Failed to send page to den:', error);
          alert(`Failed to send page to den: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes]);

  return null; // This component doesn't render anything
}
