// backend/src/services/graph_generator.ts
// Recursive knowledge graph generator for spider web visualization

import type { bigDaddyNode, babyNode } from '../types/den.js';

export interface GraphNode {
  id: string;
  type: 'bigDaddy' | 'babyNode';
  data: {
    label: string;
    query?: string;
    title?: string;
    pages: string[];
    conceptList: any[];
    comparisonScore?: number;
    denned?: boolean;
    answer?: string;
    shortAnswer?: string;
  };
  position: {
    x: number;
    y: number;
  };
  style: {
    background: string;
    color: string;
    border: string;
    width: number;
    height: number;
    borderRadius: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    textAlign: string;
    padding: string;
    fontSize: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  style: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
  label?: string;
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
    averageComparisonScore: number;
  };
}

// Configuration for the spider web layout
const SPIDER_WEB_CONFIG = {
  centerRadius: 80,           // Distance from center for first level (increased for better visibility)
  levelSpacing: 100,          // Distance between levels (reduced for tighter layout)
  angleSpread: Math.PI * 2,   // Full circle spread
  minDistance: 60,            // Minimum distance between nodes (reduced)
  maxDistance: 200,           // Maximum distance from parent (reduced)
  centerX: 500,               // Center X coordinate (moved to center of typical screen)
  centerY: 400,               // Center Y coordinate (moved to center of typical screen)
};

// Color schemes for different node types and comparison scores
const NODE_STYLES = {
  bigDaddy: {
    background: '#db2777',
    color: '#fff',
    border: '4px solid #fff',
    width: 150,              // Increased size for bigDaddyNode
    height: 150,             // Increased size for bigDaddyNode
    fontSize: '16px',        // Larger font for better visibility
  },
  babyNode: {
    highScore: { // comparisonScore > 0.7
      background: '#10b981',
      color: '#fff',
      border: '2px solid #059669',
      width: 80,             // Reduced size for better layout
      height: 80,            // Reduced size for better layout
      fontSize: '11px',
    },
    mediumScore: { // 0.4 <= comparisonScore <= 0.7
      background: '#f59e0b',
      color: '#fff',
      border: '2px solid #d97706',
      width: 70,             // Reduced size for better layout
      height: 70,            // Reduced size for better layout
      fontSize: '10px',
    },
    lowScore: { // comparisonScore < 0.4
      background: '#6b7280',
      color: '#fff',
      border: '2px solid #4b5563',
      width: 60,             // Reduced size for better layout
      height: 60,            // Reduced size for better layout
      fontSize: '9px',
    }
  }
};

// Edge styles based on relationship strength
const EDGE_STYLES = {
  strong: { // comparisonScore > 0.7
    stroke: '#10b981',
    strokeWidth: 3,
  },
  medium: { // 0.4 <= comparisonScore <= 0.7
    stroke: '#f59e0b',
    strokeWidth: 2,
  },
  weak: { // comparisonScore < 0.4
    stroke: '#6b7280',
    strokeWidth: 1,
    strokeDasharray: '5,5',
  }
};

/**
 * Main function to generate a recursive knowledge graph from a central bigDaddyNode
 */
export function generateKnowledgeGraph(centralNode: bigDaddyNode): GraphResult {
  console.log('🕸️ Starting knowledge graph generation...');
  console.log('📊 Central node:', centralNode.query);
  console.log('📊 Children count:', centralNode.children.length);
  
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIdMap = new Map<string, string>(); // Maps node titles to IDs
  let nodeCounter = 0;
  let maxDepth = 0;
  let totalComparisonScore = 0;
  let scoreCount = 0;

  // Generate unique ID for a node
  function generateNodeId(node: bigDaddyNode | babyNode): string {
    const key = 'query' in node ? node.query : node.title;
    if (nodeIdMap.has(key)) {
      return nodeIdMap.get(key)!;
    }
    const id = `node-${++nodeCounter}`;
    nodeIdMap.set(key, id);
    return id;
  }

  // Calculate distance based on comparison score
  function calculateDistance(comparisonScore: number, level: number): number {
    const baseDistance = SPIDER_WEB_CONFIG.centerRadius + (level * SPIDER_WEB_CONFIG.levelSpacing);
    const scoreMultiplier = Math.max(0.4, comparisonScore); // Minimum 40% of base distance for better visibility
    return Math.min(baseDistance * scoreMultiplier, SPIDER_WEB_CONFIG.maxDistance);
  }

  // Get node style based on type and comparison score
  function getNodeStyle(node: bigDaddyNode | babyNode, level: number) {
    if ('query' in node) {
      // bigDaddyNode
      return {
        ...NODE_STYLES.bigDaddy,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
        padding: '10px',
      };
    } else {
      // babyNode
      const score = node.comparisonScore || 0;
      let style;
      if (score > 0.7) {
        style = NODE_STYLES.babyNode.highScore;
      } else if (score >= 0.4) {
        style = NODE_STYLES.babyNode.mediumScore;
      } else {
        style = NODE_STYLES.babyNode.lowScore;
      }
      
      return {
        ...style,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
        padding: '8px',
      };
    }
  }

  // Get edge style based on comparison score
  function getEdgeStyle(comparisonScore: number) {
    if (comparisonScore > 0.7) {
      return EDGE_STYLES.strong;
    } else if (comparisonScore >= 0.4) {
      return EDGE_STYLES.medium;
    } else {
      return EDGE_STYLES.weak;
    }
  }

  // Recursive function to process nodes and their children
  function processNode(
    node: bigDaddyNode | babyNode,
    parentId: string | null,
    level: number,
    angle: number,
    parentPosition?: { x: number; y: number }
  ): void {
    const nodeId = generateNodeId(node);
    maxDepth = Math.max(maxDepth, level);

    // Calculate position
    let position: { x: number; y: number };
    
    if (parentId === null) {
      // Root node (bigDaddyNode) - place at center
      position = {
        x: SPIDER_WEB_CONFIG.centerX,
        y: SPIDER_WEB_CONFIG.centerY
      };
    } else {
      // Child node - calculate position based on parent and comparison score
      const comparisonScore = 'comparisonScore' in node ? node.comparisonScore : 1.0;
      const distance = calculateDistance(comparisonScore, level);
      
      // Calculate position in a circle around parent with even distribution
      position = {
        x: parentPosition!.x + Math.cos(angle) * distance,
        y: parentPosition!.y + Math.sin(angle) * distance
      };
    }

    // Create the graph node
    const graphNode: GraphNode = {
      id: nodeId,
      type: 'query' in node ? 'bigDaddy' : 'babyNode',
      data: {
        label: 'query' in node ? (node.shortAnswer && node.shortAnswer.trim() ? node.shortAnswer : node.query) : node.title,
        ...('query' in node ? { query: node.query } : { title: node.title }),
        pages: node.pages,
        conceptList: node.conceptList,
        ...('comparisonScore' in node ? { comparisonScore: node.comparisonScore } : {}),
        ...('denned' in node ? { denned: node.denned } : {}),
        ...('answer' in node ? { answer: node.answer } : {}),
        ...('shortAnswer' in node ? { shortAnswer: node.shortAnswer } : {}),
      },
      position,
      style: getNodeStyle(node, level)
    };

    nodes.push(graphNode);

    // Add edge to parent if not root
    if (parentId !== null) {
      const comparisonScore = 'comparisonScore' in node ? node.comparisonScore : 1.0;
      totalComparisonScore += comparisonScore;
      scoreCount++;

      const edge: GraphEdge = {
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        style: getEdgeStyle(comparisonScore),
        ...(comparisonScore > 0 ? { label: `${(comparisonScore * 100).toFixed(0)}%` } : {})
      };
      edges.push(edge);
    }

    // Process children recursively
    if ('children' in node && node.children.length > 0) {
      const angleStep = SPIDER_WEB_CONFIG.angleSpread / node.children.length;
      
      node.children.forEach((child, index) => {
        // Calculate angle for even distribution around parent
        const childAngle = angle + (index * angleStep) - (SPIDER_WEB_CONFIG.angleSpread / 2) + (angleStep / 2);
        processNode(child, nodeId, level + 1, childAngle, position);
      });
    }
  }

  // Debug: Log the central node details
  console.log('🔍 Central node debug info:');
  console.log('  - Query:', centralNode.query);
  console.log('  - Answer:', centralNode.answer);
  console.log('  - Answer length:', centralNode.answer?.length || 0);
  console.log('  - Answer is empty?', !centralNode.answer || centralNode.answer.trim() === '');
  console.log('  - Pages count:', centralNode.pages.length);
  console.log('  - Concepts count:', centralNode.conceptList.length);

  // Start the recursive processing from the central node
  processNode(centralNode, null, 0, 0);

  // Calculate statistics
  const averageComparisonScore = scoreCount > 0 ? totalComparisonScore / scoreCount : 0;

  const result: GraphResult = {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth,
      averageComparisonScore
    }
  };

  console.log('✅ Knowledge graph generation completed!');
  console.log('📊 Graph statistics:');
  console.log('  - Total nodes:', result.stats.totalNodes);
  console.log('  - Total edges:', result.stats.totalEdges);
  console.log('  - Max depth:', result.stats.maxDepth);
  console.log('  - Average comparison score:', result.stats.averageComparisonScore.toFixed(3));

  return result;
}

/**
 * Generate a simplified graph for testing or preview
 */
export function generatePreviewGraph(centralNode: bigDaddyNode, maxDepth: number = 2): GraphResult {
  console.log(`🕸️ Generating preview graph (max depth: ${maxDepth})...`);
  
  // Create a modified version of the central node with limited depth
  const limitedNode = {
    ...centralNode,
    children: centralNode.children.map(child => ({
      ...child,
      children: maxDepth > 1 ? child.children : []
    }))
  };

  return generateKnowledgeGraph(limitedNode);
}

/**
 * Export graph data for frontend consumption
 */
export function exportGraphData(graphResult: GraphResult) {
  return {
    nodes: graphResult.nodes.map(node => ({
      id: node.id,
      type: node.type,
      data: node.data,
      position: node.position,
      style: node.style
    })),
    edges: graphResult.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: edge.style,
      label: edge.label
    })),
    stats: graphResult.stats
  };
}
