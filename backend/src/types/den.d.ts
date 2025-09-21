export type concept = {
    description: string;
    title: string;
};
export type babyNode = {
    title: string;
    pages: string[];
    denPages?: string[];
    conceptList: concept[];
    denned: boolean;
    isDen: boolean;
    parent: babyNode | bigDaddyNode | null;
    children: babyNode[];
    comparisonScore: number;
};
export type bigDaddyNode = {
    query: string;
    pages: string[];
    denPages?: string[];
    conceptList: concept[];
    children: babyNode[];
    answer: string;
    shortAnswer?: string;
};
export interface DenMainResponse {
    query: string;
    pages: string[];
    conceptList: concept[];
    children: babyNode[];
    answer: string;
}
export interface SendToDenResponse {
    success: boolean;
    node?: babyNode | bigDaddyNode;
    concepts_added?: number;
    concepts_removed?: number;
    child_nodes_created?: number;
    error?: string;
}
//# sourceMappingURL=den.d.ts.map