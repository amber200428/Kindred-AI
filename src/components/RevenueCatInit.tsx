'use client';

import { useEffect } from 'react';

export function RevenueCatInit() {
  useEffect(() => {
    async function configureRevenueCat() {
      const { Capacitor } = await import('@capacitor/core');

      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const apiKey =
        (Capacitor.getPlatform() === 'ios'
          ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
          : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY) ??
        process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;

      if (!apiKey) {
        console.warn('RevenueCat API key is not configured for this platform.');
        return;
      }

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.configure({ apiKey });
    }

    configureRevenueCat().catch((error) => {
      console.error('RevenueCat initialization failed:', error);
    });
  }, []);

  return null;
}
