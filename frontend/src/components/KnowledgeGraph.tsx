// frontend/src/components/KnowledgeGraph.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  averageComparisonScore: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  stats: GraphStats;
}

const KnowledgeGraph: React.FC = () => {
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load graph data from backend
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🕸️ Loading knowledge graph...');
      
      const response = await fetch('http://localhost:4000/generate-graph');
      const result = await response.json();
      
      if (result.success) {
        setGraphData(result);
        setNodes(result.graph.nodes);
        setEdges(result.graph.edges);
        console.log('✅ Graph loaded successfully:', result.stats);
      } else {
        setError(result.error || 'Failed to load graph');
      }
    } catch (err) {
      console.error('❌ Error loading graph:', err);
      setError('Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  // Load graph on component mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      
      // Alt+B to go back
      if (event.altKey && event.key === 'b') {
        event.preventDefault();
        console.log('🔙 Alt+B pressed - going back to home');
        router.push('/');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);
    setShowPopup(true);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setShowPopup(false);
    setSelectedNode(null);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-pink-500">🕸️ Knowledge Graph</h1>
            {graphData && (
              <div className="text-sm text-gray-300">
                {graphData.stats.totalNodes} nodes • {graphData.stats.totalEdges} edges
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadGraphData}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            
            <div className="text-xs text-gray-400">
              <kbd className="bg-gray-700 px-1 py-0.5 rounded text-xs">Alt+B</kbd> Back
            </div>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="h-full">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-2">❌ Error</div>
              <div className="text-gray-300 mb-4">{error}</div>
              <button
                onClick={loadGraphData}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-gray-900"
          >
            <Controls 
              className="bg-gray-800 border-gray-600" 
              position="bottom-right"
            />
            <Background 
              color="#374151" 
              gap={20} 
              size={1}
            />
          </ReactFlow>
        )}
      </div>

      {/* Node Details Popup */}
      {showPopup && selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-600 w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-pink-500 mb-2">
                  {selectedNode.data.query || selectedNode.data.title}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${selectedNode.type === 'bigDaddy' ? 'bg-pink-500' : 'bg-green-500'}`}></div>
                    {selectedNode.type === 'bigDaddy' ? 'Central Node' : 'Child Node'}
                  </span>
                  <span>{selectedNode.data.pages?.length || 0} sources</span>
                  <span>{selectedNode.data.conceptList?.length || 0} concepts</span>
                </div>
              </div>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-white text-3xl font-bold p-2 hover:bg-gray-700 rounded"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Short Answer */}
              {selectedNode.data.shortAnswer && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Quick Summary:</h4>
                  <p className="text-lg font-medium text-white">{selectedNode.data.shortAnswer}</p>
                </div>
              )}
              
              {/* Detailed Information */}
              {selectedNode.data.answer && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Detailed Information:</h4>
                  <p className="text-gray-200 leading-relaxed mb-4">{selectedNode.data.answer}</p>
                </div>
              )}
              
              {/* Concepts */}
              {selectedNode.data.conceptList && selectedNode.data.conceptList.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">🧠</span>
                    Key Concepts
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.data.conceptList.map((concept: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-pink-600 to-pink-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
                      >
                        {concept.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pages Used */}
              {selectedNode.data.pages && selectedNode.data.pages.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">📚</span>
                    Sources Used
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto bg-gray-700 rounded-lg p-4">
                    {selectedNode.data.pages.map((page: string, index: number) => (
                      <div key={index} className="bg-gray-600 p-3 rounded-lg hover:bg-gray-500 transition-colors">
                        <a
                          href={page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 break-all text-sm flex items-start"
                        >
                          <span className="mr-2 text-gray-400">🔗</span>
                          {page}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h3 className="text-sm font-bold mb-2">Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-pink-500"></div>
            <span>Central Node</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>High Score (&gt;70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Medium Score (40-70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Low Score (&lt;40%)</span>
          </div>
          <div className="pt-2 border-t border-gray-600 mt-2">
            <div className="text-gray-300">
              💡 Click any node to see detailed information
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;