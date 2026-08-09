"use client";

import { usePlayer } from "@/lib/player";
import { ClaimScreen } from "./ClaimScreen";

/**
 * Everything behind "we know who you are".
 *
 * Deliberately renders a real explanation when setup is incomplete rather
 * than a white screen — the most likely person to hit that state is Choolwe
 * mid-deploy, and a blank page tells them nothing.
 */
export function Gate({ children }: { children: React.ReactNode }) {
  const { me, loading, error, configured } = usePlayer();

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 pad-safe-t pad-safe-b">
        <h1 className="text-2xl font-black tracking-tight">Almost there</h1>
        <p className="text-sm leading-relaxed text-mute">
          Supabase isn&apos;t connected yet. Add{" "}
          <code className="text-paper">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-paper">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="text-paper">.env.local</code> (or to the Vercel
          project&apos;s environment variables) and reload.
        </p>
        <p className="text-sm leading-relaxed text-mute">
          See <code className="text-paper">SETUP.md</code> for the five-minute
          version.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-line border-t-flame motion-safe:animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 pad-safe-t pad-safe-b">
        <h1 className="text-2xl font-black tracking-tight">
          Couldn&apos;t reach the database
        </h1>
        <p className="text-sm leading-relaxed text-mute">
          Usually this means the migration hasn&apos;t been run, or anonymous
          sign-ins are still switched off in Supabase → Authentication →
          Providers.
        </p>
        <p className="font-mono text-xs text-mute/70">{error}</p>
      </main>
    );
  }

  if (!me) return <ClaimScreen />;

  return <>{children}</>;
}
