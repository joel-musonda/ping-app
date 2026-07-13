"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID, getFollowerCount } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Users, MapPin } from "lucide-react";

interface HoverCardProps {
  handle: string;
  children: React.ReactNode;
}

// Simple in-memory cache to prevent redundant backend calls during a user session
const profileCache: Record<string, { ping: any; followerCount: number }> = {};

export default function HoverCard({ handle, children }: HoverCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ ping: any; followerCount: number } | null>(null);
  
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      console.error("Failed to fetch hover card profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    
    // 250ms delay prevents the card from flashing open if someone just scrolls their mouse past the handle
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      if (!data) fetchProfileData();
    }, 250);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    
    // 300ms delay gives the user time to transition their cursor from the text into the popover itself
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Area */}
      <span className="cursor-pointer hover:underline decoration-neutral-400">
        {children}
      </span>

      {/* Popover Card */}
      {isOpen && (
        <div 
          className="absolute z-[100] bottom-full left-0 mb-2 w-64 p-4 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] animate-in fade-in slide-in-from-bottom-2 duration-150 cursor-default"
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
              {/* Header Details */}
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

              {/* Bio block */}
              <p className="text-xs text-[#c9d1d9] line-clamp-3 leading-relaxed break-words">
                {data.ping.bio || "No bio summary provided."}
              </p>

              {/* Stats & Meta Footer */}
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
      )}
    </div>
  );
}