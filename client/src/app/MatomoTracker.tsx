"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL || "";
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID || "";

// Utilisation des variables pour éviter les warnings
console.debug("Matomo config:", { MATOMO_URL, MATOMO_SITE_ID });
const MATOMO_ENABLE =
  (process.env.NEXT_PUBLIC_MATOMO_ENABLE || "false").toLowerCase() === "true";

export default function MatomoTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!MATOMO_ENABLE || typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _paq: any[] = (window as any)._paq || ((window as any)._paq = []);

    const url = `${window.location.origin}${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

    _paq.push(["setCustomUrl", url]);
    _paq.push(["setDocumentTitle", document.title]);
    _paq.push(["trackPageView"]);
    _paq.push(["enableLinkTracking"]);
  }, [pathname, searchParams]);

  // Nothing to render
  return null;
}
// Tracker Matomo
