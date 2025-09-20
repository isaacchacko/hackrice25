// In src/app/page.tsx
import SearchBar from "@/components/search_bar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-5xl font-extrabold mb-4 text-pink-500">rabbit</h1>
      <p className="text-slate-400 mb-8">Your journey of discovery starts here.</p>
      <div className="w-full max-w-2xl">
        <SearchBar />
      </div>
    </div>
  );
}