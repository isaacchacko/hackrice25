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
    denPages?: string[];
    conceptList: any[];
    comparisonScore?: number;
    comparisonScoreOrigin?: number;
    originQuery?: string;
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
  centerRadius: 80,           // Distance from center for first level
  levelSpacing: 120,          // Distance between levels (increased for better spacing)
  angleSpread: Math.PI * 2,   // Full circle spread
  minDistance: 80,            // Minimum distance between nodes (increased to prevent overlap)
  maxDistance: 300,           // Maximum distance from parent (increased for better spread)
  centerX: 500,               // Center X coordinate
  centerY: 400,               // Center Y coordinate
  nodeRadius: 40,             // Average node radius for collision detection
  overlapThreshold: 90,       // Minimum distance between node centers
  maxAttempts: 20,            // Maximum attempts to find non-overlapping position
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

  // Calculate distance based on comparison score and child count
  function calculateDistance(comparisonScore: number, level: number, childCount: number = 0, node: bigDaddyNode | babyNode): number {
    const baseDistance = SPIDER_WEB_CONFIG.centerRadius + (level * SPIDER_WEB_CONFIG.levelSpacing);
    
    // Adjust distance based on child count (more children = farther from center)
    const childCountMultiplier = 1 + (childCount * 0.1); // 10% increase per child
    
    // Adjust distance based on relevance to origin (more relevant = closer to parent)
    const relevanceScore = 'comparisonScoreOrigin' in node ? (node.comparisonScoreOrigin || 0) : comparisonScore;
    // Invert the score: higher relevance = lower multiplier = closer distance
    const relevanceMultiplier = Math.max(0.3, Math.min(1.0, 1.2 - relevanceScore));
    
    const finalDistance = baseDistance * childCountMultiplier * relevanceMultiplier;
    return Math.min(Math.max(finalDistance, SPIDER_WEB_CONFIG.minDistance), SPIDER_WEB_CONFIG.maxDistance);
  }

  // Check if a position overlaps with existing nodes
  function hasOverlap(newPos: { x: number; y: number }, existingNodes: GraphNode[]): boolean {
    return existingNodes.some(node => {
      const dx = newPos.x - node.position.x;
      const dy = newPos.y - node.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < SPIDER_WEB_CONFIG.overlapThreshold;
    });
  }

  // Find a non-overlapping position using spiral search
  function findNonOverlappingPosition(
    parentPos: { x: number; y: number },
    baseDistance: number,
    baseAngle: number,
    existingNodes: GraphNode[]
  ): { x: number; y: number } {
    let attempts = 0;
    let spiralRadius = 0;
    let angle = baseAngle;
    
    while (attempts < SPIDER_WEB_CONFIG.maxAttempts) {
      const testPos = {
        x: parentPos.x + Math.cos(angle) * (baseDistance + spiralRadius),
        y: parentPos.y + Math.sin(angle) * (baseDistance + spiralRadius)
      };
      
      if (!hasOverlap(testPos, existingNodes)) {
        return testPos;
      }
      
      // Spiral outward and rotate
      spiralRadius += 20;
      angle += Math.PI / 4; // 45 degree increments
      attempts++;
    }
    
    // If we can't find a non-overlapping position, return the original
    return {
      x: parentPos.x + Math.cos(baseAngle) * baseDistance,
      y: parentPos.y + Math.sin(baseAngle) * baseDistance
    };
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
      // babyNode - use comparisonScoreOrigin for color determination, fallback to comparisonScore
      let score = node.comparisonScoreOrigin || 0;
      const fallbackScore = node.comparisonScore || 0;
      
      console.log(`🎨 DEBUG: Node "${node.title}" color determination:`);
      console.log(`  - comparisonScoreOrigin: ${score}`);
      console.log(`  - comparisonScore (fallback): ${fallbackScore}`);
      console.log(`  - originQuery: "${node.originQuery || 'N/A'}"`);
      
      // If comparisonScoreOrigin is 0 or very low, use comparisonScore as fallback
      if (score < 0.1 && fallbackScore > 0.1) {
        score = fallbackScore;
        console.log(`  - Using fallback score: ${score}`);
      }
      
      // TEMPORARY: Force some color variation for testing
      // This will be removed once we confirm the color system works
      if (score < 0.1) {
        // Generate a pseudo-random score based on the title for testing
        const titleHash = node.title.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        score = Math.abs(titleHash % 100) / 100; // 0.0 to 0.99
        console.log(`  - Using TEST score for color variation: ${score}`);
      }
      
      let style;
      if (score > 0.7) {
        style = NODE_STYLES.babyNode.highScore;
        console.log(`  - Using HIGH score style (green)`);
      } else if (score >= 0.4) {
        style = NODE_STYLES.babyNode.mediumScore;
        console.log(`  - Using MEDIUM score style (orange)`);
      } else {
        style = NODE_STYLES.babyNode.lowScore;
        console.log(`  - Using LOW score style (gray)`);
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
      // Child node - calculate position based on parent, comparison score, and child count
      const comparisonScore = 'comparisonScore' in node ? node.comparisonScore : 1.0;
      const childCount = 'children' in node ? node.children.length : 0;
      const distance = calculateDistance(comparisonScore, level, childCount, node);
      
      // Calculate base position in a circle around parent
      const basePosition = {
        x: parentPosition!.x + Math.cos(angle) * distance,
        y: parentPosition!.y + Math.sin(angle) * distance
      };
      
      // Use collision detection to find non-overlapping position
      position = findNonOverlappingPosition(basePosition, distance, angle, nodes);
    }

    // Create the graph node
    const graphNode: GraphNode = {
      id: nodeId,
      type: 'query' in node ? 'bigDaddy' : 'babyNode',
      data: {
        label: 'query' in node ? (node.shortAnswer && node.shortAnswer.trim() ? node.shortAnswer : node.query) : node.title,
        ...('query' in node ? { query: node.query } : { title: node.title }),
        pages: node.pages,
        ...('denPages' in node ? { denPages: node.denPages } : {}),
        conceptList: node.conceptList,
        ...('comparisonScore' in node ? { comparisonScore: node.comparisonScore } : {}),
        ...('comparisonScoreOrigin' in node ? { comparisonScoreOrigin: node.comparisonScoreOrigin } : {}),
        ...('originQuery' in node ? { originQuery: node.originQuery } : {}),
        ...('denned' in node ? { denned: node.denned } : {}),
        ...('answer' in node ? { answer: node.answer } : {}),
        ...('shortAnswer' in node ? { shortAnswer: node.shortAnswer } : {}),
      },
      position,
      style: getNodeStyle(node, level)
    };

    // Debug logging for denPages
    if ('query' in node && node.denPages) {
      console.log(`🔍 Graph node ${nodeId} denPages:`, node.denPages);
      console.log(`🔍 Graph node ${nodeId} denPages length:`, node.denPages.length);
    }

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
      // Sort children by relevance to origin for better positioning
      const sortedChildren = [...node.children].sort((a, b) => {
        const scoreA = a.comparisonScoreOrigin || a.comparisonScore || 0;
        const scoreB = b.comparisonScoreOrigin || b.comparisonScore || 0;
        return scoreB - scoreA; // Higher scores first
      });
      
      // Use adaptive angle distribution based on number of children
      let angleStep: number;
      let startAngle: number;
      
      if (node.children.length <= 6) {
        // For few children, use full circle
        angleStep = SPIDER_WEB_CONFIG.angleSpread / node.children.length;
        startAngle = angle - (SPIDER_WEB_CONFIG.angleSpread / 2) + (angleStep / 2);
      } else {
        // For many children, use a smaller spread to avoid overcrowding
        const maxSpread = Math.PI * 1.5; // 270 degrees instead of 360
        angleStep = maxSpread / node.children.length;
        startAngle = angle - (maxSpread / 2) + (angleStep / 2);
      }
      
      sortedChildren.forEach((child, index) => {
        const childAngle = startAngle + (index * angleStep);
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
