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
  previousUrl: string | null;  // ADD THIS
  toggleGraphVisibility: (currentUrl?: string, router?: any) => void;  // UPDATE THIS
  clearGraph: () => void; // <-- 1. Make sure it's in the type definition
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  isGraphVisible: false,

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  addNode: (newNode) => set({ nodes: [...get().nodes, newNode] }),
  previousUrl: null,
  toggleGraphVisibility: (currentUrl?: string, router?: any) => {
    const { isGraphVisible, previousUrl } = get();

    if (!isGraphVisible) {
      // Going to graph view - store current URL and navigate to /graph
      set({
        isGraphVisible: true,
        previousUrl: currentUrl || (typeof window !== 'undefined' ? window.location.pathname : null)
      });

      if (router) {
        router.push('/graph');
      }
    } else {
      // Going back - navigate to previous URL
      set({
        isGraphVisible: false
      });

      if (router && previousUrl) {
        router.push(previousUrl);
      } else if (router) {
        router.push('/'); // Fallback to home
      }
    }
  },

  // <-- 2. Make sure the function is implemented here
  clearGraph: () => {
    set({ nodes: [], edges: [] });
  },
}));
