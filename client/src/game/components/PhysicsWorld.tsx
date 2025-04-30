import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";

// PhysicsWorld component initializes Cannon.js and manages the physics simulation
const PhysicsWorld = ({ children }: { children: React.ReactNode }) => {
  const { initPhysics, updatePhysics, cleanup } = usePhysics();
  const lastTimeRef = useRef<number>(0);
  const [physicsReady, setPhysicsReady] = useState(false);
  
  // Initialize physics world when component mounts
  useEffect(() => {
    console.log("PhysicsWorld component mounted");
    
    // Make sure CANNON.js is loaded
    const loadCannonJs = () => {
      if (typeof window !== 'undefined' && !(window as any).CANNON) {
        // Dynamically load CANNON.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
        script.async = true;
        script.onload = () => {
          console.log('CANNON.js loaded dynamically');
          // Initialize physics after script loads
          initPhysics();
          setPhysicsReady(true);
        };
        document.head.appendChild(script);
      } else {
        // CANNON.js already loaded
        console.log('CANNON.js already available');
        initPhysics();
        setPhysicsReady(true);
      }
    };
    
    loadCannonJs();
    
    // Clean up function
    return () => {
      console.log("PhysicsWorld component unmounting");
      cleanup();
    };
  }, [initPhysics, cleanup]);
  
  // Update physics on each frame
  useFrame((state) => {
    if (!physicsReady) return;
    
    const time = state.clock.getElapsedTime();
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    
    // Only update if deltaTime is reasonable (prevent large steps after pausing)
    if (deltaTime < 0.1) {
      updatePhysics(deltaTime);
    }
  });
  
  return <>{children}</>;
};

export default PhysicsWorld;
