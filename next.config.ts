import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Static export — the whole app is prerendered HTML/CSS/JS with no server.
   *
   * Not a preference: Vercel's *.vercel.app edge range (216.198.79.0/24,
   * 64.29.17.0/24) is not routable from Zambia. vercel.com resolves and
   * loads fine, the deployed app never connects, on both wifi and mobile.
   * A link nobody in the group can open is worth nothing, so hosting has to
   * be portable — this builds to `out/` and runs on any static host.
   *
   * Nothing is lost: every route was already `○ (Static)`, and all the live
   * behaviour comes from Supabase over HTTPS from the browser. When Stage 2
   * needs privileged reads (releasing survey answers inside a live round),
   * those belong in a Supabase Edge Function anyway — which keeps the
   * service-role key off the host entirely.
   */
  output: "export",

  // Static export can't run the image optimiser. We don't use next/image,
  // but this keeps the door open without a build failure.
  images: { unoptimized: true },

  // Emit `/survey/index.html` rather than `/survey.html`, so hosts that
  // don't rewrite extensionless paths still serve the right file.
  trailingSlash: true,

  /**
   * GitHub Pages serves a project site from a subpath
   * (choolwec.github.io/commutation), so every asset and link needs that
   * prefix or the page loads with no CSS and a dead survey button.
   *
   * Set by the deploy workflow only. Local dev and `npm run shots` keep
   * running at the root, and moving to a host that serves from the domain
   * root later means unsetting one variable rather than editing code.
   */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,

  /**
   * `next dev` refuses cross-origin requests for its own JS chunks by
   * default (a DNS-rebinding protection) — fine normally, but it silently
   * 403s every `_next/static/chunks/*.js` request the moment the dev
   * server is reached through anything other than localhost: a phone on
   * the LAN, an ngrok/cloudflared tunnel, etc. The page's HTML still
   * loads, so it *looks* like the app is hanging (stuck on the loading
   * spinner) when actually the React bundle itself never arrived.
   * Wildcarded so it covers the LAN IP, any trycloudflare.com tunnel used
   * to test on a real phone, and localhost itself. Dev-only — this option
   * does nothing in a production/static-export build.
   */
  allowedDevOrigins: ["*.trycloudflare.com", "172.20.10.*", "localhost"],
};

export default nextConfig;
