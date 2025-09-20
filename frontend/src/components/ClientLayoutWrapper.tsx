"use client";
import { useStore } from "@/store";
import dynamic from 'next/dynamic';

// Import without curly braces for a default export
import GlobalKeyListener from "@/components/GlobalKeyListener";

const SearchGraph = dynamic(() => import('@/components/SearchGraph'), { ssr: false });

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode; }) {
  const { isGraphVisible } = useStore();
  console.log(`[WRAPPER] Graph visibility is: ${isGraphVisible}`);
  return (
    <>
      <GlobalKeyListener />
      {children}
      {isGraphVisible && <SearchGraph />}
    </>
  );
}