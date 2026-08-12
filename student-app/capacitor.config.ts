import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.edukids.app',
  appName: 'tushunGo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // OAuth callback URL'ni app ichida ushlash uchun
    allowNavigation: ['*.tushungo.uz', 'accounts.google.com', '*.google.com'],
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
  plugins: {
    Browser: {
      // In-App Browser sozlamalari
    },
  },
};

export default config;
