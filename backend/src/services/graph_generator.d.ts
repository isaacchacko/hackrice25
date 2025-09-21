import type { bigDaddyNode } from '../types/den.js';
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
/**
 * Main function to generate a recursive knowledge graph from a central bigDaddyNode
 */
export declare function generateKnowledgeGraph(centralNode: bigDaddyNode): GraphResult;
/**
 * Generate a simplified graph for testing or preview
 */
export declare function generatePreviewGraph(centralNode: bigDaddyNode, maxDepth?: number): GraphResult;
/**
 * Export graph data for frontend consumption
 */
export declare function exportGraphData(graphResult: GraphResult): {
    nodes: {
        id: string;
        type: "bigDaddy" | "babyNode";
        data: {
            label: string;
            query?: string;
            title?: string;
            pages: string[];
            denPages?: string[];
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
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
        style: {
            stroke: string;
            strokeWidth: number;
            strokeDasharray?: string;
        };
        label: string | undefined;
    }[];
    stats: {
        totalNodes: number;
        totalEdges: number;
        maxDepth: number;
        averageComparisonScore: number;
    };
};
//# sourceMappingURL=graph_generator.d.ts.map