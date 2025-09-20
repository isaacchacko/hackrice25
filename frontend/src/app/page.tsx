// In src/app/page.tsx
import Image from 'next/image';
import SearchBar from "@/components/search_bar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-black p-8">
      {/* New Flex Container for Image and Title */}
      <div className="flex items-center mb-6 gap-6">
        <Image
          src="/images/white lines.png"
          alt="A small rabbit mascot"
          width={200}
          height={200}
          className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48"
        />
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[8rem] 2xl:text-[9rem] font-extrabold text-pink-500">
          rabbit
        </h1>
      </div>

      <p className="text-slate-400 mb-8 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-center px-8">
        Your journey of discovery starts here. Start burrowing.
      </p>
      
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-8">
        <SearchBar />
      </div>
    </div>
  );
}