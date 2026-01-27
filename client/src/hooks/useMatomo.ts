import { useEffect } from "react";
import MatomoTracker from "@datapunt/matomo-tracker-js";

let matomoInstance: MatomoTracker | null = null;

const initMatomo = () => {
  if (!matomoInstance && typeof window !== "undefined") {
    const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL;
    const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;

    if (matomoUrl && siteId) {
      matomoInstance = new MatomoTracker({
        urlBase: matomoUrl,
        siteId: parseInt(siteId),
        disabled: false,
        heartBeat: {
          active: true,
          seconds: 15,
        },
        linkTracking: true,
        configurations: {
          disableCookies: false,
          setSecureCookie: true,
          setRequestMethod: "POST",
        },
      });
    }
  }
  return matomoInstance;
};

export const useMatomo = () => {
  useEffect(() => {
    initMatomo();
  }, []);

  const trackPageView = (customTitle?: string) => {
    const matomo = initMatomo();
    if (matomo) {
      if (customTitle) {
        matomo.trackPageView({ documentTitle: customTitle });
      } else {
        matomo.trackPageView();
      }
    }
  };

  const trackEvent = (
    category: string,
    action: string,
    name?: string,
    value?: number,
  ) => {
    const matomo = initMatomo();
    if (matomo) {
      matomo.trackEvent({
        category,
        action,
        name,
        value,
      });
    }
  };

  const trackSiteSearch = (keyword: string, category?: string) => {
    const matomo = initMatomo();
    if (matomo) {
      matomo.trackSiteSearch({
        keyword,
        category,
      });
    }
  };

  const trackCustomEvent = (
    category: string,
    action: string,
    name?: string,
    value?: number,
  ) => {
    // Utilise l'API native Matomo via _paq
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _paq = (window as any)._paq || [];
      _paq.push(["trackEvent", category, action, name, value]);
    }
  };

  const setUserId = (userId: string) => {
    // Utilise l'API native Matomo via _paq
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _paq = (window as any)._paq || [];
      _paq.push(["setUserId", userId]);
    }
  };

  const trackGoal = (goalId: number, customRevenue?: number) => {
    // Utilise l'API native Matomo via _paq
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _paq = (window as any)._paq || [];
      _paq.push(["trackGoal", goalId, customRevenue]);
    }
  };

  return {
    trackPageView,
    trackEvent,
    trackSiteSearch,
    trackCustomEvent,
    trackGoal,
    setUserId,
    matomo: matomoInstance,
  };
};
