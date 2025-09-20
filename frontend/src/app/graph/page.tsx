// In src/components/SearchGraph.tsx
'use client';

import React, { useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '@/store';
import ElectronStatePoller from '@/components/ElectronStatePoller';

// Interface for the JSON file structure
interface ElectronState {
  nodes: Node[];
  edges?: Edge[];
  timestamp: number;
  lastAction?: string;
}

const SearchGraph: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    clearGraph
  } = useStore();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Fetch nodes from JSON file on component mount
  useEffect(() => {
    const fetchNodesFromFile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch the electron state JSON file
        const response = await fetch('../../../../electron-state.json', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log('No electron state file found, starting with empty graph');
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to fetch state: ${response.status}`);
        }

        const electronState: ElectronState = await response.json();

        // Update last fetch time
        setLastFetchTime(electronState.timestamp || Date.now());

        // Clear existing nodes and add fetched nodes
        if (electronState.nodes && electronState.nodes.length > 0) {
          console.log('Loading nodes from file:', electronState.nodes.length);

          // Clear current graph
          clearGraph();

          // Add each node from the file
          electronState.nodes.forEach((node: Node) => {
            addNode(node);
          });
        } else {
          console.log('No nodes found in state file');
        }

      } catch (err) {
        console.error('Error fetching electron state:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodesFromFile();
  }, []); // Empty dependency array - only run on mount

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading Graph...</p>
          <p className="text-sm text-gray-300 mt-2">Fetching nodes from Electron</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center">
        <div className="text-white text-center max-w-md">
          <div className="text-red-400 mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Failed to Load Graph</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-90 backdrop-blur-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
        />
        <Controls
          position="top-right"
          showInteractive={false}
        />

        {/* Status indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
          Nodes: {nodes.length} | Last Update: {new Date(lastFetchTime).toLocaleTimeString()}
        </div>

        {/* Keep the poller for ongoing updates */}
        <ElectronStatePoller />
      </ReactFlow>
    </div>
  );
};

export default SearchGraph;
