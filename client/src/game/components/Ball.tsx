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
  
  // Ball state tracking for stuck detection and manual reset
  const ballStateRef = useRef({
    lastPosition: new THREE.Vector3(),
    lastMovementTime: Date.now(),
    stuckTime: 0,
    lastResetTime: 0,
    isResetting: false,
    positionHistory: [] as THREE.Vector3[]
  });
  
  // Manual ball reset function
  const resetBall = () => {
    const ballBody = getBody('ball');
    if (ballBody && !ballStateRef.current.isResetting) {
      // Prevent spam resets
      if (Date.now() - ballStateRef.current.lastResetTime < 1000) return;
      
      ballStateRef.current.isResetting = true;
      ballStateRef.current.lastResetTime = Date.now();
      
      // Reset ball position and physics
      ballBody.position.set(0, 1, 0);
      ballBody.velocity.set(0, 0, 0);
      ballBody.angularVelocity.set(0, 0, 0);
      
      console.log("🔄 Ball manually reset to center");
      
      // Add visual feedback
      if (ballRef.current) {
        const material = ballRef.current.material as THREE.MeshStandardMaterial;
        if (material) {
          // Flash the ball briefly
          material.emissive.set('#ffffff');
          setTimeout(() => {
            material.emissive.set('#000000');
          }, 300);
        }
      }
      
      // Allow next reset after a delay
      setTimeout(() => {
        ballStateRef.current.isResetting = false;
      }, 1000);
    }
  };
  
  // Add R key listener for manual ball reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        resetBall();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
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
          restitution: 0.8  // Increased bounciness for more action
        },
        linearDamping: 0.3, // Reduced damping for more responsive movement
        angularDamping: 0.4, // Better rotation
        userData: {
          type: 'ball',
          id: 'ball'
        },
        // Collisions will be handled in the useFrame loop
        onCollide: (body) => { 
          // Play sound for collisions with sufficient velocity
          // Check if the ball exists and get its velocity
          if (ballRef.current) {
            const tempVector = new THREE.Vector3();
            // Use type assertion to handle null case
            const ballMesh = ballRef.current as THREE.Mesh;
            const ballPos = ballMesh.getWorldPosition(tempVector);
            
            const ballVelocity = Math.sqrt(
              Math.pow(ballPos.x, 2) + Math.pow(ballPos.z, 2)
            );
            
            if (ballVelocity > bounceThreshold) {
              playHit();
            }
          }
        }
      });
      
      console.log("⚽ Ball physics initialized with improved properties");
    }
  }, [addBody, playHit, getBody]);
  
  // Update the visual ball with physics body position
  useFrame((_, delta) => {
    const ballBody = getBody('ball');
    if (ballBody && ballRef.current) {
      const position = ballBody.position;
      const quaternion = ballBody.quaternion;
      
      // Update visual mesh with physics data
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
        ballBody.velocity.x *= -0.8; // More energetic bounce
        boundaryHit = true;
      }
      
      // End boundary checks (Z-axis) 
      // More restrictive goal area check - only allow the ball to pass through a narrower goal area
      const isInGoalArea = Math.abs(position.x) < 2.6 && (Math.abs(position.z) > halfDepth - 1);
      
      if (!isInGoalArea) {
        if (Math.abs(position.z) > halfDepth) {
          newPos.z = Math.sign(position.z) * halfDepth;
          ballBody.velocity.z *= -0.8; // More energetic bounce
          boundaryHit = true;
        }
      }
      
      // Check for out-of-bounds corners - stricter corner handling
      const cornerDistance = 2.3; // Slightly reduced to make corners more accessible
      const aiGoalZ = -halfDepth - 1;
      const playerGoalZ = halfDepth + 1;
      
      // Check if ball is in goal corners
      if ((Math.abs(position.x) > cornerDistance) && 
          ((Math.abs(position.z - aiGoalZ) < 2.2) || (Math.abs(position.z - playerGoalZ) < 2.2))) {
        // Push ball away from corners with greater force
        const directionX = position.x > 0 ? -1 : 1;
        const directionZ = position.z > 0 ? -1 : 1;
        
        // Apply stronger force to push ball out of corners
        ballBody.velocity.x += directionX * 5;
        ballBody.velocity.z += directionZ * 5;
        boundaryHit = true;
        
        console.log("⚽ Ball pushed away from goal corner");
      }
      
      // Play sound when ball hits boundary
      if (boundaryHit && Math.sqrt(
        ballBody.velocity.x * ballBody.velocity.x + 
        ballBody.velocity.z * ballBody.velocity.z) > 0.8) {
        playHit();
      }
      
      // Update position history for stuck detection (keep last 10 positions)
      const newPosVector = new THREE.Vector3(position.x, position.y, position.z);
      ballStateRef.current.positionHistory.push(newPosVector);
      if (ballStateRef.current.positionHistory.length > 10) {
        ballStateRef.current.positionHistory.shift();
      }
      
      // Check for stuck ball detection
      if (ballStateRef.current.positionHistory.length >= 10) {
        // Get the average movement distance over last 10 frames
        let averageMovement = 0;
        for (let i = 1; i < ballStateRef.current.positionHistory.length; i++) {
          averageMovement += ballStateRef.current.positionHistory[i].distanceTo(
            ballStateRef.current.positionHistory[i-1]
          );
        }
        averageMovement /= (ballStateRef.current.positionHistory.length - 1);
        
        // If almost no movement for extended time and ball is not at center, likely stuck
        if (averageMovement < 0.001 && 
            (Math.abs(position.x) > 1 || Math.abs(position.z) > 1) && 
            Math.abs(ballBody.velocity.length()) < 0.1) {
          
          ballStateRef.current.stuckTime += delta;
          
          // Reset if stuck for more than 3 seconds
          if (ballStateRef.current.stuckTime > 3) {
            resetPosition = true;
            console.log("⚽ Ball appears to be stuck, resetting...");
            ballStateRef.current.stuckTime = 0;
          }
        } else {
          // Reset stuck timer
          ballStateRef.current.stuckTime = 0;
        }
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
      if (resetPosition && !ballStateRef.current.isResetting) {
        ballStateRef.current.isResetting = true;
        ballBody.position.set(0, 1, 0);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        console.log("⚽ Ball reset to center position");
        
        // Give visual feedback that the ball has been reset
        if (ballRef.current) {
          const material = ballRef.current.material as THREE.MeshStandardMaterial;
          if (material) {
            // Flash the ball briefly
            material.emissive.set('#ffffff');
            setTimeout(() => {
              material.emissive.set('#000000');
            }, 300);
          }
        }
        
        // Allow next reset after a delay
        setTimeout(() => {
          ballStateRef.current.isResetting = false;
        }, 1000);
      } else if (!newPos.equals(position)) {
        // Apply boundary correction
        ballBody.position.copy(newPos);
      }
      
      // Log ball position occasionally for debugging
      if (Math.random() < 0.005) {
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
