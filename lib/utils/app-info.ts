import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Fallback version from package.json
const PACKAGE_VERSION = '1.1.0';

export interface AppInfo {
  version: string;
  build?: string;
  name: string;
}

export async function getAppInfo(): Promise<AppInfo> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return {
        version: info.version,
        build: info.build,
        name: info.name,
      };
    } catch (e) {
      console.warn('Failed to get native app info:', e);
    }
  }

  // Fallback for web
  return {
    version: PACKAGE_VERSION,
    name: 'OurPot',
  };
}
