// In src/store.ts
import { create } from 'zustand';
import { Node, Edge, OnNodesChange, OnEdgesChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';

type RFState = {
  nodes: Node[];
  edges: Edge[];
  isGraphVisible: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (newNode: Node) => void;
  toggleGraphVisibility: () => void;
  clearGraph: () => void; // <-- 1. Make sure it's in the type definition
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  isGraphVisible: false,

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  addNode: (newNode) => set({ nodes: [...get().nodes, newNode] }),
  toggleGraphVisibility: () => set({ isGraphVisible: !get().isGraphVisible }),

  // <-- 2. Make sure the function is implemented here
  clearGraph: () => {
    set({ nodes: [], edges: [] });
  },
}));