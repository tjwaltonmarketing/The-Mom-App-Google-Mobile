import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
}

if (isNativeApp()) {
  document.addEventListener('deviceready', () => {
    document.addEventListener('resume', () => {
      const root = document.getElementById('root');
      if (!root || !root.hasChildNodes() || document.title.includes('404')) {
        window.location.replace('/');
      }
    });
  });

  window.addEventListener('error', (e) => {
    if (e.message?.includes('404') || e.message?.includes('ChunkLoadError') || e.message?.includes('Loading chunk')) {
      window.location.replace('/');
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
