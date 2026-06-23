// global.d.ts
declare module '*.css' {
  const content: any;
  export default content;
}

interface Window {
  desktop?: {
    ping: () => Promise<string>;
  };
  audioEngine?: {
    initialize: () => Promise<{ success: boolean }>;
    shutdown: () => Promise<{ success: boolean }>;
    version: () => Promise<string>;
    isInitialized: () => Promise<boolean>;
    engineInfo: () => Promise<{
      version: string;
      initialized: boolean;
      sampleRate: number;
      bufferSize: number;
    }>;
  };
}