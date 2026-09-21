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
        exists: (filePath: string) => Promise<boolean>;
      };
      window: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
      };
    };
  }
}
