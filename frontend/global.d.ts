declare global {
  interface Window {
    electronAPI: {
      sendUrl: (url: string) => void;
    };
  }
}
export { };
