// In src/app/page.tsx
import Image from 'next/image';
import SearchBar from "@/components/search_bar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      
      {/* New Flex Container for Image and Title */}
      <div className="flex items-center mb-4"> {/* Use flex to align items horizontally */}
        <Image
          src="/images/white lines.png"
          alt="A small rabbit mascot"
          width={100}  // Smaller width
          height={100} // Smaller height (adjust as needed to maintain aspect ratio)
          className="mr-3" // Add some margin to the right of the image
        />
        <h1 className="text-5xl font-extrabold text-pink-500">rabbit</h1>
      </div>
      
      <p className="text-slate-400 mb-8">Your journey of discovery starts here. Start burrowing.</p>
      <div className="w-full max-w-2xl">
        <SearchBar />
      </div>
    </div>
  );
}