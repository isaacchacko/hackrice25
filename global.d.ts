
// global.d.ts
export { };

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: unknown) => void;
      on: (channel: string, callback: (data: unknown) => void) => void;
      invoke: <T = unknown, A = unknown>(channel: string, data: A) => Promise<T>;
    };
  }
}
