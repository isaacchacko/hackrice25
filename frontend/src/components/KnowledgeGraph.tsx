// frontend/src/components/KnowledgeGraph.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store';
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
  const { isGraphVisible } = useStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [burrowing, setBurrowing] = useState(false);
  const [burrowSession, setBurrowSession] = useState<any>(null);
  const [showBurrowInterface, setShowBurrowInterface] = useState(false);

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
    console.log('Node data:', node.data);
    console.log('denPages:', node.data.denPages);
    console.log('denPages length:', node.data.denPages?.length || 0);
    setSelectedNode(node);
    setShowPopup(true);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setShowPopup(false);
    setSelectedNode(null);
  }, []);

  // Handle initiating burrow session
  const handleBurrow = useCallback(async (childTitle: string) => {
    setBurrowing(true);
    try {
      console.log('🔍 Initiating burrow session for child node:', childTitle);
      console.log('🔍 Selected node data:', selectedNode?.data);
      console.log('🔍 Selected node title:', selectedNode?.data?.title);
      console.log('🔍 Selected node label:', selectedNode?.data?.label);
      console.log('🔍 Selected node query:', selectedNode?.data?.query);
      
      const response = await fetch('http://localhost:4000/burrow-into-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childTitle: childTitle
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initiate burrow: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Burrow response:', result);
      
      if (result.success) {
        console.log('✅ Burrow session initiated!');
        console.log('📊 Pages found:', result.burrowSession.pages.length);
        console.log('📊 Burrow session data:', result.burrowSession);
        
        // Set up the burrow session
        setBurrowSession(result.burrowSession);
        setShowBurrowInterface(true);
        
        // Set graph visibility to false so Alt+G will show the graph
        useStore.setState({ isGraphVisible: false });
        
        // Automatically open the first page in the Electron browser
        if (result.burrowSession.pages.length > 0) {
          const firstPageUrl = result.burrowSession.pages[0].url;
          console.log('🌐 Auto-opening first page in Electron browser:', firstPageUrl);
          
          // Use the same URL loading system as hop functionality
          const browserUrl = `http://localhost:4400/url?to=${encodeURIComponent(firstPageUrl)}&burrowSessionId=${result.burrowSession.childTitle}`;
          console.log('🌐 Browser URL:', browserUrl);
          
          // Navigate directly without opening new tab
          window.location.href = browserUrl;
        }
        
        // Close the popup
        closePopup();
      } else {
        console.error('❌ Burrow initiation failed:', result.error);
        console.error('❌ Full response:', result);
        alert(`Failed to initiate burrow into "${childTitle}": ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error during burrow initiation:', error);
      alert(`Error during burrow initiation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBurrowing(false);
    }
  }, [closePopup]);

  // Handle adding a page to the burrowed child node
  const handleAddPageToBurrow = useCallback(async (url: string) => {
    if (!burrowSession) return;
    
    try {
      console.log('🕳️ Adding page to burrowed child:', url);
      
      const response = await fetch(`http://localhost:4000/burrow/${burrowSession.childTitle}/add-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add page: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Page added to burrowed child!');
        console.log('📊 New children added:', result.child_nodes_created);
        
        // Refresh the graph to show the new structure
        await loadGraphData();
        
        // Show success message
        alert(`Successfully added page! Created ${result.child_nodes_created} new child concepts.`);
      } else {
        console.error('❌ Failed to add page:', result.error);
        alert(`Failed to add page: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error adding page to burrow:', error);
      alert(`Error adding page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [burrowSession, loadGraphData]);

  // Handle opening a page in the Electron browser (like hop functionality)
  const handleOpenPageInBrowser = useCallback(async (url: string) => {
    if (!burrowSession) return;
    
    try {
      console.log('🌐 Opening page in Electron browser:', url);
      
      // Use the same URL loading system as hop functionality
      const browserUrl = `http://localhost:4400/url?to=${encodeURIComponent(url)}&burrowSessionId=${burrowSession.childTitle}`;
      
      // Navigate directly without opening new tab
      window.location.href = browserUrl;
      
    } catch (error) {
      console.error('❌ Error opening page in browser:', error);
      alert(`Error opening page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [burrowSession]);

  // Handle burrow navigation
  const handleBurrowNavigation = useCallback(async (direction: 'next' | 'prev') => {
    if (!burrowSession) return;
    
    try {
      const response = await fetch(`http://localhost:4000/burrow/${burrowSession.childTitle}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          direction: direction
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to navigate: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setBurrowSession(result.burrowState);
      } else {
        console.error('❌ Navigation failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during navigation:', error);
    }
  }, [burrowSession]);

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
                  <span>{selectedNode.data.denPages?.length || 0} den sources</span>
                  <span>{selectedNode.data.conceptList?.length || 0} concepts</span>
                  {selectedNode.data.isDen && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                      🏠 Den
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-white text-3xl font-bold p-2 hover:bg-gray-700 rounded"
              >
                ×
              </button>
            </div>
            
            {/* Learn More Button - Only show for child nodes that are not already dens */}
            {selectedNode.type !== 'bigDaddy' && !selectedNode.data.isDen && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg border border-blue-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-200 mb-1">
                      🕳️ Learn More About This Concept
                    </h4>
                    <p className="text-sm text-blue-300">
                      Burrow deeper into this concept to discover related ideas and create a new knowledge den.
                    </p>
                  </div>
                  <button
                    onClick={() => handleBurrow(selectedNode.data.title)}
                    disabled={burrowing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {burrowing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Burrowing...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Learn More</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
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
              
              {/* Children of Den Nodes */}
              {selectedNode.data.children && selectedNode.data.children.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">👶</span>
                    Child Concepts
                    {selectedNode.data.isDen && (
                      <span className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Den
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedNode.data.children.map((child: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-green-600 to-green-500 text-white p-3 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                          // Create a temporary node to show child details
                          const childNode = {
                            id: `child-${index}`,
                            type: 'child',
                            data: {
                              title: child.title,
                              conceptList: child.conceptList || [],
                              denPages: child.pages || [],
                              isDen: child.isDen || false,
                              children: child.children || []
                            }
                          };
                          setSelectedNode(childNode);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-sm">{child.title}</h5>
                            <p className="text-xs opacity-90 mt-1">
                              {child.conceptList?.length || 0} concepts • Score: {child.comparisonScore || 0}%
                            </p>
                          </div>
                          {child.isDen && (
                            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                              🏠
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pages Used */}
              {selectedNode.data.denPages && selectedNode.data.denPages.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">📚</span>
                    Sources Added to Den
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto bg-gray-700 rounded-lg p-4">
                    {selectedNode.data.denPages.map((page: string, index: number) => (
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

      {/* Burrow Interface */}
      {showBurrowInterface && burrowSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-600 w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-blue-500 mb-2">
                  🕳️ Burrowing into "{burrowSession.childTitle}"
                </h3>
                <p className="text-gray-400">
                  Explore pages related to this concept and add them to create new child concepts
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                  <span>Page {burrowSession.currentIndex + 1} of {burrowSession.pages.length}</span>
                  <span>•</span>
                  <span>Ctrl+Left/Right to navigate</span>
                  <span>•</span>
                  <span>Ctrl+D to add current page</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBurrowInterface(false);
                  setBurrowSession(null);
                }}
                className="text-gray-400 hover:text-white text-3xl font-bold p-2 hover:bg-gray-700 rounded"
              >
                ×
              </button>
            </div>
            
            {/* Current Page Display */}
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">Current Page</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBurrowNavigation('prev')}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => handleBurrowNavigation('next')}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Next →
                  </button>
                </div>
              </div>
              
              {burrowSession.pages[burrowSession.currentIndex] && (
                <div className="space-y-3">
                  <div className="bg-gray-600 p-3 rounded-lg">
                    <a
                      href={burrowSession.pages[burrowSession.currentIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 break-all text-sm flex items-start"
                    >
                      <span className="mr-2 text-gray-400">🔗</span>
                      {burrowSession.pages[burrowSession.currentIndex].url}
                    </a>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenPageInBrowser(burrowSession.pages[burrowSession.currentIndex].url)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      🌐 Open in Browser
                    </button>
                    <button
                      onClick={() => handleAddPageToBurrow(burrowSession.pages[burrowSession.currentIndex].url)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      ➕ Add to Den
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* All Pages List */}
            <div>
              <h4 className="text-lg font-semibold text-gray-300 mb-3">All Available Pages</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-700 rounded-lg p-4">
                {burrowSession.pages.map((page: any, index: number) => (
                  <div
                    key={index}
                    className={`bg-gray-600 p-3 rounded-lg hover:bg-gray-500 transition-colors cursor-pointer ${
                      index === burrowSession.currentIndex ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      // Navigate to this page
                      const direction = index > burrowSession.currentIndex ? 'next' : 'prev';
                      const steps = Math.abs(index - burrowSession.currentIndex);
                      for (let i = 0; i < steps; i++) {
                        handleBurrowNavigation(direction);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 break-all text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {page.url}
                        </a>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPageInBrowser(page.url);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Open
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPageToBurrow(page.url);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Add
                        </button>
                        {index === burrowSession.currentIndex && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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