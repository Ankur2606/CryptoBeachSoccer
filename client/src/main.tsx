import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Pre-load CANNON.js before rendering the app
const loadCannonJs = () => {
  return new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && !(window as any).CANNON) {
      console.log('Pre-loading CANNON.js');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
      script.async = true;
      script.onload = () => {
        console.log('CANNON.js pre-loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to pre-load CANNON.js, will try again when needed');
        resolve(); // Continue anyway
      };
      document.head.appendChild(script);
    } else {
      console.log('CANNON.js already available');
      resolve();
    }
  });
};

// Initialize app after loading CANNON.js
loadCannonJs().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
