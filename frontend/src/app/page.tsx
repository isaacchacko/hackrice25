// In src/app/page.tsx
import Image from 'next/image';
import SearchBar from "@/components/search_bar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-black p-8">
      {/* New Flex Container for Image and Title */}
      <div className="flex items-center mb-12 gap-8">
        <Image
          src="/images/white lines.png"
          alt="A small rabbit mascot"
          width={200}
          height={200}
          className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 2xl:w-64 2xl:h-64"
        />
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem] font-extrabold text-pink-500">
          rabbit
        </h1>
      </div>

      <p className="text-slate-400 mb-16 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-center px-8">
        Your journey of discovery starts here. Start burrowing.
      </p>
      
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-8">
        <SearchBar />
      </div>
    </div>
  );
}