import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.edukids.app',
  appName: 'tushunGo',
  webDir: 'dist',
  server: {
    // Production da web URL ishlatmaslik (lokal fayllardan ishlaydi)
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
};

export default config;
