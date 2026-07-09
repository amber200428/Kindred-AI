import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kindred.ai',
  appName: 'Kindred AI',
  webDir: 'www',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
    allowNavigation: ['*'],
  },
};

export default config;
