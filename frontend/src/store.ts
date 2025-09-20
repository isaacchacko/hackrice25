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
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  isGraphVisible: false,

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  addNode: (newNode) => set({ nodes: [...get().nodes, newNode] }),

  toggleGraphVisibility: () => {
    const currentState = get().isGraphVisible;
    console.log(`[STORE] Toggling visibility. Current state: ${currentState}, New state: ${!currentState}`);
    set({ isGraphVisible: !currentState });
  },
}));