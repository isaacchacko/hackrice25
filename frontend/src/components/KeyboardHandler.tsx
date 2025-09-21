'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export default function KeyboardHandler() {
  const { nodes } = useStore();
  
  console.log('🎹 KeyboardHandler mounted with nodes:', nodes.length);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check for Ctrl+D
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        console.log('🎯 Ctrl+D detected!');
        
        // Get the current page URL
        const currentUrl = window.location.href;
        console.log('🎯 Ctrl+D pressed! Current URL:', currentUrl);
        
        // Find the most recent search node (the one with denData)
        console.log('🔍 All nodes:', nodes);
        const searchNodes = nodes.filter(node => 
          node.data.type === 'search' && node.data.denData
        );
        
        console.log('🔍 Search nodes found:', searchNodes);
        
        if (searchNodes.length === 0) {
          console.log('❌ No search nodes with den data found');
          console.log('Available nodes:', nodes);
          console.log('Node types:', nodes.map(n => ({ id: n.id, type: n.data.type, hasDenData: !!n.data.denData })));
          return;
        }
        
        // Get the most recent search node
        const latestSearchNode = searchNodes[searchNodes.length - 1];
        console.log('🏠 Found search node:', latestSearchNode);
        
        // Convert denData to bigDaddyNode format for sendToDen
        const denData = latestSearchNode.data.denData;
        const bigDaddyNode = {
          query: denData.query,
          pages: denData.pages || [],
          conceptList: denData.conceptList || [],
          children: denData.children || [],
          answer: denData.answer || ""
        };
        
        console.log('📊 Den content BEFORE sending page:');
        console.log('  - Query:', bigDaddyNode.query);
        console.log('  - Pages:', bigDaddyNode.pages, `(length: ${bigDaddyNode.pages.length})`);
        console.log('  - Concepts:', bigDaddyNode.conceptList, `(length: ${bigDaddyNode.conceptList.length})`);
        console.log('  - Children:', bigDaddyNode.children, `(length: ${bigDaddyNode.children.length})`);
        
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
              node: bigDaddyNode
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to send to den: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('✅ Page sent to den successfully!');
          console.log('📊 Den content AFTER sending page:');
          console.log('  - Query:', result.node?.query);
          console.log('  - Pages:', result.node?.pages, `(length: ${result.node?.pages?.length})`);
          console.log('  - Concepts:', result.node?.conceptList, `(length: ${result.node?.conceptList?.length})`);
          console.log('  - Children:', result.node?.children, `(length: ${result.node?.children?.length})`);
          console.log('📈 Statistics:');
          console.log('  - Concepts added:', result.concepts_added);
          console.log('  - Concepts removed:', result.concepts_removed);
          
        } catch (error) {
          console.error('❌ Failed to send page to den:', error);
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
