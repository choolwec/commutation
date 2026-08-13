"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player";
import { getSupabase } from "@/lib/supabase/client";
import { BackToHub } from "@/components/BackToHub";

type Photo = { id: string; path: string; player_id: string; created_at: string };

/**
 * The recap gallery — every Evidence photo, newest first. Deliberately
 * public: unlike survey answers, these were never sealed (see Evidence.tsx),
 * so there's nothing to gate here beyond the normal Gate (know who you are
 * before you see the party's photos, same as everything else in the app).
 */
export function RecapGallery() {
  const { roster } = usePlayer();
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase!
        .from("evidence_photos")
        .select("id,path,player_id,created_at")
        .order("created_at", { ascending: false });
      if (!cancelled) setPhotos((data as Photo[]) ?? []);
    }
    load();

    const channel = supabase
      .channel("evidence-gallery")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "evidence_photos" },
        load,
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const urlFor = (path: string) =>
    getSupabase()?.storage.from("evidence").getPublicUrl(path).data.publicUrl ?? "";

  return (
    <main className="mx-auto max-w-2xl px-5 pad-safe-t pad-safe-b">
      <BackToHub className="mb-3 block" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">Commutation</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">The recap</h1>
      <p className="mt-2 text-sm text-mute">
        {photos.length} photo{photos.length === 1 ? "" : "s"}, whenever they were taken.
      </p>

      {photos.length === 0 ? (
        <p className="mt-10 text-center text-sm text-mute">Nothing yet — check back once the day starts.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p, i) => {
            const author = roster.find((r) => r.id === p.player_id);
            return (
              <div
                key={p.id}
                className="rise relative aspect-square overflow-hidden rounded-xl border border-line bg-ink-2"
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
              >
                <img src={urlFor(p.path)} alt="" className="h-full w-full object-cover" loading="lazy" />
                {author && (
                  <span
                    className="absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: `${author.color}cc`, color: "#08070c" }}
                  >
                    {author.emoji}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
