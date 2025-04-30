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
  
  // Initialize physics world when component mounts - only once
  useEffect(() => {
    console.log("PhysicsWorld component mounted");
    
    // Prevent duplicate initialization
    if (initCompletedRef.current) {
      console.log("Physics init already attempted, skipping");
      return;
    }
    
    // Mark initialization as attempted to prevent loops
    initCompletedRef.current = true;
    
    // Initialize physics directly - CANNON.js should already be loaded in GameScreen
    try {
      // Check if physics is already initialized
      if (!world) {
        console.log("Initializing physics world");
        initPhysics();
        setPhysicsReady(true);
      } else {
        console.log("Physics world already initialized");
        setPhysicsReady(true);
      }
    } catch (error) {
      console.error("Error initializing physics:", error);
      setPhysicsReady(false);
      
      // Skip auto-loading CANNON.js - it should be loaded by GameScreen
    }
    
    // Clean up function
    return () => {
      console.log("PhysicsWorld component unmounting");
      cleanup();
      setPhysicsReady(false);
    };
  }, []); // Empty dependency array - run only once on mount
  
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
      
      // Every 300 frames, add a debug message to help troubleshoot
      if (world.bodies.length > 0) {
        // Log active bodies count for debugging
        const dynamicBodies = world.bodies.filter((b: any) => b.mass > 0).length;
        const staticBodies = world.bodies.filter((b: any) => b.mass === 0).length;
        
        console.log(`Active physics bodies: ${world.bodies.length} (${dynamicBodies} dynamic, ${staticBodies} static)`);
        
        // Log player position if exists
        const playerBody = world.bodies.find((b: any) => b.userData?.id === 'player_character');
        if (playerBody) {
          console.log('Player position:', playerBody.position);
        }
        
        // Log ball position if exists
        const ballBody = world.bodies.find((b: any) => b.userData?.id === 'ball');
        if (ballBody) {
          console.log('Ball position:', ballBody.position);
        }
      }
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
