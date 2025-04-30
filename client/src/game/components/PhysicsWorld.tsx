import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";

// PhysicsWorld component initializes Cannon.js and manages the physics simulation
const PhysicsWorld = ({ children }: { children: React.ReactNode }) => {
  const { initPhysics, updatePhysics } = usePhysics();
  const lastTimeRef = useRef<number>(0);
  
  // Initialize physics world when component mounts
  useEffect(() => {
    // Initialize Cannon.js physics world
    initPhysics();
    
    // Clean up function
    return () => {
      // Physics cleanup happens in the store
    };
  }, [initPhysics]);
  
  // Update physics on each frame
  useFrame((state) => {
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
