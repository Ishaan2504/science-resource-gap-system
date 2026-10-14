import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.idealabapp',
  appName: 'Science on Wheels',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
