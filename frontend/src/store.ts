// In src/store.ts
"use client";

import { create } from 'zustand';
import { Node, Edge, addEdge, OnNodesChange, OnEdgesChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Define the shape of our state
type RFState = {
  nodes: Node[];
  edges: Edge[];
  isGraphVisible: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (newNode: Node) => void;
  toggleGraphVisibility: () => void;
};

// Create the store
export const useStore = create<RFState>((set, get) => ({
  // Initial State
  nodes: [{ id: '1', position: { x: 0, y: 0 }, data: { label: 'Start Here' } }],
  edges: [],
  isGraphVisible: false, // Initially hidden

  // Handlers for when nodes/edges are moved or changed in the UI
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  // --- Our Custom Actions ---

  // Action to add a new node
  addNode: (newNode) => {
    set({
      nodes: [...get().nodes, newNode],
    });
  },

  // Action to toggle the graph's visibility
  toggleGraphVisibility: () => {
    set({ isGraphVisible: !get().isGraphVisible });
  },
}));