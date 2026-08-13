"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 16;
      const y = (e.clientY / innerHeight - 0.5) * 16;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F7] text-neutral-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#0084FF] selection:text-white relative overflow-x-hidden box-border">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto w-full">
        {/* Animated Googly Eyes - Scaled down slightly for compact mobile screens */}
        <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Left Eye */}
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-white border border-neutral-200/80 shadow-lg flex items-center justify-center relative overflow-hidden">
            <div
              className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-neutral-900 absolute transition-transform duration-100 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              }}
            >
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/40 rounded-full absolute top-1.5 left-1.5 sm:top-2 sm:left-2" />
            </div>
          </div>

          {/* Right Eye */}
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-white border border-neutral-200/80 shadow-lg flex items-center justify-center relative overflow-hidden">
            <div
              className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-neutral-900 absolute transition-transform duration-100 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              }}
            >
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/40 rounded-full absolute top-1.5 left-1.5 sm:top-2 sm:left-2" />
            </div>
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-2xl sm:text-4xl font-serif font-normal tracking-tight text-neutral-900 mb-2 sm:mb-3">
          404, Page Not Found.
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mb-6 sm:mb-8 max-w-[280px] sm:max-w-xs leading-relaxed">
          Looks like these eyes couldn't spot the page you were looking for. It might have been moved or doesn't exist.
        </p>

        {/* Action Buttons with Ping's theme accent color (#0084FF) */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-full bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Please Take Me Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}