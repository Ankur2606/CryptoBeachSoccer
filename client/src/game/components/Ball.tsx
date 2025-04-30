import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useAudio } from "@/lib/stores/useAudio";
import * as THREE from "three";
import { FIELD_WIDTH, FIELD_DEPTH } from "../constants";

const Ball = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const { addBody, getBody, applyForce } = usePhysics();
  const { playHit } = useAudio();
  const [lastBounce, setLastBounce] = useState(0);
  const bounceThreshold = 2; // Minimum velocity for bounce sound
  
  useEffect(() => {
    if (ballRef.current) {
      // Create the ball body in the physics world with improved properties
      addBody({
        position: [0, 0.5, 0],
        mass: 0.8, // Slightly reduced mass for better control
        shape: 'sphere',
        radius: 0.5,
        material: {
          friction: 0.4,    // Increased friction for better control
          restitution: 0.7  // Slightly reduced bounciness for more predictable physics
        },
        linearDamping: 0.4, // Increased air resistance
        angularDamping: 0.5, // Rotation damping for more stable movement
        userData: {
          type: 'ball',
          id: 'ball'
        },
        // Collisions will be handled in the useFrame loop
        onCollide: () => { /* Handled in useFrame */ }
      });
    }
  }, [addBody, playHit, getBody]);
  
  // Update the visual ball with physics body position
  useFrame(() => {
    const ballBody = getBody('ball');
    if (ballBody && ballRef.current) {
      const position = ballBody.position;
      const quaternion = ballBody.quaternion;
      
      ballRef.current.position.copy(position as THREE.Vector3);
      ballRef.current.quaternion.copy(quaternion as THREE.Quaternion);
      
      // Enhanced boundary enforcement system
      const halfWidth = FIELD_WIDTH/2 - 0.5; // Reduced to keep ball further from edge
      const halfDepth = FIELD_DEPTH/2 - 0.5; // Reduced to keep ball further from edge
      let resetPosition = false;
      let newPos = new THREE.Vector3(position.x, position.y, position.z);
      
      // Regular field boundaries
      let boundaryHit = false;
      
      // Side boundary checks (X-axis)
      if (Math.abs(position.x) > halfWidth) {
        newPos.x = Math.sign(position.x) * halfWidth;
        ballBody.velocity.x *= -0.7; // More energetic bounce
        boundaryHit = true;
      }
      
      // End boundary checks (Z-axis) 
      // More restrictive goal area check - only allow the ball to pass through a narrower goal area
      const isInGoalArea = Math.abs(position.x) < 2.6 && (Math.abs(position.z) > halfDepth - 1);
      
      if (!isInGoalArea) {
        if (Math.abs(position.z) > halfDepth) {
          newPos.z = Math.sign(position.z) * halfDepth;
          ballBody.velocity.z *= -0.7; // More energetic bounce
          boundaryHit = true;
        }
      }
      
      // Check for out-of-bounds corners - stricter corner handling
      const cornerDistance = 2.5;
      const aiGoalZ = -halfDepth - 1;
      const playerGoalZ = halfDepth + 1;
      
      // Check if ball is in goal corners
      if ((Math.abs(position.x) > cornerDistance) && 
          ((Math.abs(position.z - aiGoalZ) < 2) || (Math.abs(position.z - playerGoalZ) < 2))) {
        // Push ball away from corners with greater force
        const directionX = position.x > 0 ? -1 : 1;
        const directionZ = position.z > 0 ? -1 : 1;
        
        ballBody.velocity.x += directionX * 3;
        ballBody.velocity.z += directionZ * 3;
        boundaryHit = true;
        
        console.log("⚽ Ball pushed away from goal corner");
      }
      
      // Play sound when ball hits boundary
      if (boundaryHit && Math.sqrt(
        ballBody.velocity.x * ballBody.velocity.x + 
        ballBody.velocity.z * ballBody.velocity.z) > 0.8) {
        playHit();
      }
      
      // Reset ball if it falls off the field or gets stuck
      if (position.y < -5 || position.y > 20 || 
          // Additional stuck detection
          (Math.abs(position.x) > FIELD_WIDTH + 5 || Math.abs(position.z) > FIELD_DEPTH + 5)) {
        resetPosition = true;
      }
      
      // Reset ball if it's in the "dead zone" behind the goal posts
      const isInDeadZone = (Math.abs(position.x) > 3.5 && Math.abs(position.z) > halfDepth + 0.5);
      if (isInDeadZone) {
        resetPosition = true;
        console.log("⚽ Ball was in dead zone behind goal posts, resetting...");
      }
      
      // Apply fixes
      if (resetPosition) {
        ballBody.position.set(0, 1, 0);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        console.log("⚽ Ball reset to center position");
      } else if (!newPos.equals(position)) {
        // Apply boundary correction
        ballBody.position.copy(newPos);
      }
      
      // Log ball position occasionally for debugging
      if (Math.random() < 0.01) {
        console.log("Ball position:", position);
      }
    }
  });
  
  return (
    <mesh ref={ballRef} castShadow receiveShadow>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#5cb85c" /> {/* Green for Pepe */}
    </mesh>
  );
};

export default Ball;
