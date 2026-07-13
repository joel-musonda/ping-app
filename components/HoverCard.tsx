"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID, getFollowerCount } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Users, MapPin } from "lucide-react";

interface HoverCardProps {
  handle: string;
  children: React.ReactNode;
}

const profileCache: Record<string, { ping: any; followerCount: number }> = {};

export default function HoverCard({ handle, children }: HoverCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ ping: any; followerCount: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Track viewport positioning coordinates
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    };
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position the card right above the hovered handle text, accounting for page scroll
      setCoords({
        top: rect.top + window.scrollY - 8, // 8px spacing gap above text
        left: rect.left + window.scrollX,
      });
    }
  };

  const fetchProfileData = async () => {
    const cleanedHandle = handle.replace("@", "").trim();
    if (profileCache[cleanedHandle]) {
      setData(profileCache[cleanedHandle]);
      return;
    }

    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
        Query.equal("handle", cleanedHandle),
      ]);

      if (res.documents.length > 0) {
        const pingDoc = res.documents[0];
        const followers = await getFollowerCount(pingDoc.user_id);
        const unifiedData = { ping: pingDoc, followerCount: followers };
        
        profileCache[cleanedHandle] = unifiedData;
        setData(unifiedData);
      }
    } catch (err) {
      console.error("Failed to fetch hover card data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    
    updatePosition();
    
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      if (!data) fetchProfileData();
    }, 250);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // The floating visual element that mounts into the body portal
  const cardContent = (
    <div 
      className="absolute z-[9999] w-64 p-4 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] animate-in fade-in slide-in-from-bottom-2 duration-150 cursor-default"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: "translateY(-100%)", // Shift card completely above the calculation coordinates
      }}
      onMouseEnter={() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      }}
      onMouseLeave={handleMouseLeave}
    >
      {loading && !data ? (
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#21262d]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 bg-[#21262d] rounded w-2/3" />
              <div className="h-2.5 bg-[#21262d] rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-[#21262d] rounded w-full" />
          <div className="h-3 bg-[#21262d] rounded w-1/3" />
        </div>
      ) : data ? (
        <div className="flex flex-col space-y-3">
          <div 
            className="flex items-center gap-3 cursor-pointer group/card"
            onClick={() => router.push(`/${data.ping.handle}`)}
          >
            <div className="w-10 h-10 rounded-full border border-[#30363d] overflow-hidden bg-neutral-800 shrink-0">
              {data.ping.avatar_url ? (
                <img src={data.ping.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm uppercase text-white">
                  {data.ping.handle.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate group-hover/card:underline">
                {data.ping.name || data.ping.handle}
              </span>
              <span className="text-xs text-[#8b949e]">@{data.ping.handle}</span>
            </div>
          </div>

          <p className="text-xs text-[#c9d1d9] line-clamp-3 leading-relaxed break-words">
            {data.ping.bio || "Hello there, Welcome to my ping!"}
          </p>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-[#21262d] text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#8b949e]" />
              <span className="font-bold text-white">{data.followerCount}</span>
              <span>followers</span>
            </div>
            {data.ping.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8b949e]" />
                <span className="truncate">{data.ping.location}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#8b949e] italic">Profile missing.</p>
      )}
    </div>
  );

  return (
    <>
      <span 
        ref={triggerRef}
        className="cursor-pointer hover:underline decoration-neutral-400"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {isOpen && mounted && createPortal(cardContent, document.body)}
    </>
  );
}