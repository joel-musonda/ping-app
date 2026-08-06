"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20;
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F7] text-neutral-900 flex flex-col items-center justify-center p-6 selection:bg-[#0084FF] selection:text-white relative overflow-hidden">
      {/* Background subtle noise/glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Animated Googly Eyes Inspiration */}
        <div className="flex items-center gap-6 mb-8">
          {/* Left Eye */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white border border-neutral-200/80 shadow-lg flex items-center justify-center relative overflow-hidden">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neutral-900 absolute transition-transform duration-100 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              }}
            >
              <div className="w-3 h-3 bg-white/40 rounded-full absolute top-2 left-2" />
            </div>
          </div>

          {/* Right Eye */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white border border-neutral-200/80 shadow-lg flex items-center justify-center relative overflow-hidden">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neutral-900 absolute transition-transform duration-100 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              }}
            >
              <div className="w-3 h-3 bg-white/40 rounded-full absolute top-2 left-2" />
            </div>
          </div>
        </div>

        {/* Typography following the inspiration style + Ping branding */}
        <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-neutral-900 mb-3">
          404, Page Not Found.
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mb-8 max-w-xs leading-relaxed">
          Looks like these eyes couldn't spot the page you were looking for. It might have been moved or doesn't exist.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Please Take Me Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}