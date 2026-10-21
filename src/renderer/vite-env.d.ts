/// <reference types="vite/client" />

import { visionAPI } from '../preload/index';

declare global {
  interface Window {
    visionAPI: typeof visionAPI;
  }
}
