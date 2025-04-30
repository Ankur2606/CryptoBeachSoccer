import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import { GRAVITY } from "../constants";

// PhysicsWorld component initializes Cannon.js and manages the physics simulation
const PhysicsWorld = ({ children }: { children: React.ReactNode }) => {
  const { initPhysics, updatePhysics, cleanup, world } = usePhysics();
  const lastTimeRef = useRef<number>(0);
  const [physicsReady, setPhysicsReady] = useState(false);
  const initCompletedRef = useRef(false);
  const frameCount = useRef(0);
  
  // Initialize physics world when component mounts
  useEffect(() => {
    console.log("PhysicsWorld component mounted");
    
    // Initialize physics directly - CANNON.js should already be loaded in GameScreen
    try {
      // Check if physics is already initialized
      if (!world && !initCompletedRef.current) {
        console.log("Initializing physics world");
        initPhysics();
        initCompletedRef.current = true;
        setPhysicsReady(true);
      } else if (world) {
        console.log("Physics world already initialized");
        setPhysicsReady(true);
      }
    } catch (error) {
      console.error("Error initializing physics:", error);
      // Attempt to recover by loading CANNON.js directly as fallback
      if (typeof window !== 'undefined' && !(window as any).CANNON) {
        console.warn("CANNON.js not found, loading directly");
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
        script.async = false;
        
        script.onload = () => {
          console.log('CANNON.js loaded as fallback');
          try {
            initPhysics();
            setPhysicsReady(true);
          } catch (e) {
            console.error("Failed to initialize physics even after loading CANNON.js:", e);
          }
        };
        
        document.head.appendChild(script);
      }
    }
    
    // Clean up function
    return () => {
      console.log("PhysicsWorld component unmounting");
      cleanup();
      setPhysicsReady(false);
      initCompletedRef.current = false;
    };
  }, [initPhysics, cleanup, world]);
  
  // Debug logging for physics world state
  useEffect(() => {
    if (physicsReady && world) {
      console.log("Physics world is ready, gravity set to:", world.gravity);
      
      // Set up collision event logging for debugging
      const handleCollision = (event: any) => {
        const bodyA = event.body.userData ? event.body.userData.id : 'unknown';
        const bodyB = event.target.userData ? event.target.userData.id : 'unknown';
        
        // Only log significant collisions (e.g., ball with player)
        if (bodyA === 'ball' || bodyB === 'ball') {
          console.log(`Collision between ${bodyA} and ${bodyB}`);
        }
      };
      
      // Enable this for debugging if needed
      // Object.values(bodies).forEach(body => {
      //   if (body.userData?.id === 'ball') {
      //     body.addEventListener('collide', handleCollision);
      //   }
      // });
    }
  }, [physicsReady, world]);
  
  // Update physics on each frame
  useFrame((state) => {
    // Skip if physics is not ready
    if (!physicsReady || !world) return;
    
    frameCount.current += 1;
    
    // Periodic logging for debugging
    if (frameCount.current % 300 === 0) {
      console.log("Physics world active, frame:", frameCount.current);
    }
    
    const time = state.clock.getElapsedTime();
    const deltaTime = Math.min(time - lastTimeRef.current, 1/30); // Cap at 30fps minimum
    lastTimeRef.current = time;
    
    // Only update if deltaTime is reasonable (prevent large steps after pausing)
    if (deltaTime > 0 && deltaTime < 0.1) {
      updatePhysics(deltaTime);
    }
  });
  
  // Just render children without wrapping in another element
  return <>{children}</>;
};

export default PhysicsWorld;
