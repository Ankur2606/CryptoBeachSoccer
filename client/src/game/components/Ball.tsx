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
      
      // Keep ball within boundary constraints
      const halfWidth = FIELD_WIDTH/2 + 0.5; // Half width of field + small buffer
      const halfDepth = FIELD_DEPTH/2 + 0.5; // Half depth of field + small buffer
      let resetPosition = false;
      let newPos = new THREE.Vector3(position.x, position.y, position.z);
      
      // Side boundary checks (X-axis)
      if (Math.abs(position.x) > halfWidth) {
        newPos.x = Math.sign(position.x) * halfWidth;
        ballBody.velocity.x *= -0.5; // Bounce back with reduced velocity
        if (Math.abs(ballBody.velocity.x) > 0.5) playHit(); // Play sound for boundary hit
      }
      
      // End boundary checks (Z-axis) - Only if not through the goal
      const isNearGoal = Math.abs(position.x) < 3; // Check if the ball is near the goal area
      
      if (!isNearGoal) {
        if (Math.abs(position.z) > halfDepth) {
          newPos.z = Math.sign(position.z) * halfDepth;
          ballBody.velocity.z *= -0.5; // Bounce back with reduced velocity
          if (Math.abs(ballBody.velocity.z) > 0.5) playHit(); // Play sound for boundary hit
        }
      }
      
      // Reset ball if it falls off the field or gets stuck
      if (position.y < -5 || position.y > 20) {
        resetPosition = true;
      }
      
      if (resetPosition) {
        ballBody.position.set(0, 1, 0);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        console.log("⚽ Ball reset to center position");
      } else if (!newPos.equals(position)) {
        // Apply boundary correction if needed
        ballBody.position.copy(newPos);
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
