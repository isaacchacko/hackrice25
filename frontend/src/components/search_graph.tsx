// In src/components/SearchGraph.tsx
'use client';

import ReactFlow, { Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '@/store';

// This is the only option you need to add
const proOptions = { hideAttribution: true };

function SearchGraph() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useStore();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-90 backdrop-blur-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default SearchGraph;