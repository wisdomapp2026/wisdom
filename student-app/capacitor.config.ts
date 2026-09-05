import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.wisdom.app',
  appName: 'Wisdom',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // OAuth callback URL va API'larni app ichida ruxsat berish
    allowNavigation: ['*.wisdom.uz', 'accounts.google.com', '*.google.com', '*.supabase.co'],
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
