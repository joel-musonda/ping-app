"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID, getNotebooksForUser } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Query } from "appwrite";
import { Book, Folder, Calendar, MapPin, Link2, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PingProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [ping, setPing] = useState<any>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [Query.equal("handle", handle)])
      .then(async (res) => {
        if (res.documents.length === 0) {
          setPing(false);
          return;
        }
        const pingDoc = res.documents[0];
        setPing(pingDoc);

        const currentUser = await getCurrentUser();
        const isOwnProfile = currentUser?.$id === pingDoc.user_id;

        const nbs = await getNotebooksForUser(pingDoc.user_id, !isOwnProfile);
        setNotebooks(nbs);
      })
      .catch((err) => {
        console.error(err);
        setPing(false);
      })
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <p className="text-sm text-neutral-500 animate-pulse font-medium">Loading workspace layout...</p>
      </div>
    );
  }

  if (!ping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white text-center p-4">
        <h2 className="text-xl font-bold text-neutral-900">Workspace Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1">The user handle @{handle} does not exist on Ping.</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 bg-white text-neutral-900">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Left Profile Sidebar Workspace */}
        <div className="md:col-span-1 flex flex-col space-y-4">
          
          {/* Avatar Placeholder Area */}
          <div className="w-32 h-32 md:w-full md:h-auto md:aspect-square bg-neutral-100 rounded-full md:rounded-2xl border border-neutral-200 overflow-hidden flex items-center justify-center shadow-sm">
            <span className="text-3xl font-bold text-neutral-400 uppercase">
              {handle.charAt(0)}
            </span>
          </div>

          {/* User Meta Frame */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {ping.name || "Software Developer"}
            </h1>
            <p className="text-lg text-neutral-500">@{ping.handle}</p>
          </div>

          {/* Bio Data Section */}
          <div className="space-y-3 pt-2 text-sm text-neutral-600 border-t border-neutral-100">
            <p className="leading-relaxed">
              {ping.bio || "Just trying to become the best Software Developer I can be. Building seamless workspaces with Next.js and Appwrite."}
            </p>
            
            <div className="space-y-2 pt-2 text-neutral-500 text-xs font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-400" />
                <span>Lusaka, Zambia</span>
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-neutral-400" />
                <a href="#" className="text-neutral-900 hover:underline">ping.dev/{ping.handle}</a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Joined Workspace</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Notebooks Dashboard Grid */}
        <div className="md:col-span-3 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
            <Folder className="w-4 h-4 text-neutral-700" />
            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
              Notebooks ({notebooks.length})
            </h2>
          </div>

          {notebooks.length === 0 ? (
            <div className="border border-dashed border-neutral-200 rounded-xl p-12 text-center">
              <Book className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-900">No notebooks yet</p>
              <p className="text-xs text-neutral-500 mt-0.5">Notebooks created by this user will display here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notebooks.map((nb) => (
                <a 
                  key={nb.$id} 
                  href={`/notebooks/${nb.$id}`}
                  className="block group transition-transform"
                >
                  <Card className="h-full border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all duration-200">
                    <CardHeader className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Book className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
                            <CardTitle className="text-md font-semibold text-neutral-900 group-hover:underline underline-offset-2 decoration-1">
                              {nb.title}
                            </CardTitle>
                          </div>
                          {!nb.is_public && (
                            <Lock className="w-3.5 h-3.5 text-neutral-400" title="Private Notebook" />
                          )}
                        </div>
                        <CardDescription className="text-xs text-neutral-500 line-clamp-2">
                          Click to open this synchronized notebook and manage its active layout chapters.
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          nb.is_public 
                            ? "bg-neutral-100 text-neutral-600 border-neutral-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {nb.is_public ? "Public" : "Private"}
                        </span>
                        <span>• Updated recently</span>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}