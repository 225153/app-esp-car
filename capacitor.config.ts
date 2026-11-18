import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.espcar',
  appName: 'ESP Car',
  webDir: 'dist',
  server: { cleartext: true },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
