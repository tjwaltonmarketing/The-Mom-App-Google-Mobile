interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        renderButton: (
          element: HTMLElement,
          config: {
            theme?: string;
            size?: string;
            width?: number;
            text?: string;
            shape?: string;
          }
        ) => void;
        prompt: () => void;
      };
    };
  };
}
