import { fileURLToPath, URL } from 'node:url';
import base44 from '@base44/vite-plugin';

export default {
  plugins: [
    base44({
      legacySDKImports: false,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
    }),
  ],
  resolve: {
    alias: {
      'socket.io-client': fileURLToPath(new URL('./src/lib/socketIoClientStub.js', import.meta.url)),
    },
  },
};