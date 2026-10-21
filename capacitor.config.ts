import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nz.taxvault.mobile',
  appName: 'TaxVault',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    backgroundColor: '#f8fafc',
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
    },
  },
};

export default config;
