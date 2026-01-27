import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import "./main-app";
import Script from "next/script";
import MatomoTracker from "./MatomoTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UNIT Card Game",
  description: "Jeu de cartes stratégique basé sur la Révolution française",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enableMatomo =
    (process.env.NEXT_PUBLIC_MATOMO_ENABLE || "false").toLowerCase() === "true";
  const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL || "";
  const matomoSiteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID || "";
  return (
    <html lang="fr">
      <body className={inter.className}>
        {enableMatomo && (
          <>
            {/* Matomo Cloud Configuration */}
            <Script id="matomo-preinit" strategy="afterInteractive">
              {`
                var _paq = window._paq = window._paq || [];
                _paq.push(['trackPageView']);
                _paq.push(['enableLinkTracking']);
                (function() {
                  var u = '${matomoUrl}/';
                  _paq.push(['setTrackerUrl', u + 'matomo.php']);
                  _paq.push(['setSiteId', '${matomoSiteId}']);
                })();
              `}
            </Script>
            {/* Load Matomo Cloud script */}
            <Script
              id="matomo-loader"
              strategy="afterInteractive"
              src="https://cdn.matomo.cloud/unitcardgame.matomo.cloud/matomo.js"
            />
            {/* Track route changes */}
            <MatomoTracker />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
// Layout avec Matomo
