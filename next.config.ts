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
};

export default nextConfig;
