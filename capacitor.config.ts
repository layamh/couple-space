import type { CapacitorConfig } from '@capacitor/cli';

/** Capacitor：直接加载 Vite 构建产物，Android WebView 使用 https scheme。 */
const config: CapacitorConfig = {
  appId: 'com.couplespace.app',
  appName: 'Couple Space',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      permissions: ['locationWhenInUse'],
    },
  },
};

export default config;
