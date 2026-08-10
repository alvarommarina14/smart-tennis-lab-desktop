export {};

declare global {
  interface Window {
    stl?: {
      session: {
        read: () => Promise<string | null>;
        write: (payload: string) => Promise<void>;
        clear: () => Promise<void>;
      };
      video: {
        pick: () => Promise<string | null>;
      };
    };
  }
}
