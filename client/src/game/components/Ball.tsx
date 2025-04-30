import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import * as THREE from "three";

const Ball = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const { addBody, getBody, applyForce } = usePhysics();
  
  useEffect(() => {
    if (ballRef.current) {
      // Create the ball body in the physics world
      addBody({
        position: [0, 0.5, 0],
        mass: 1,
        shape: 'sphere',
        radius: 0.5,
        material: {
          friction: 0.3,
          restitution: 0.8 // Make the ball bouncy
        },
        linearDamping: 0.3, // Add some air resistance
        userData: {
          type: 'ball',
          id: 'ball'
        }
      });
    }
  }, [addBody]);
  
  // Update the visual ball with physics body position
  useFrame(() => {
    const ballBody = getBody('ball');
    if (ballBody && ballRef.current) {
      const position = ballBody.position;
      const quaternion = ballBody.quaternion;
      
      ballRef.current.position.copy(position as THREE.Vector3);
      ballRef.current.quaternion.copy(quaternion as THREE.Quaternion);
      
      // Reset ball if it falls off the field
      if (position.y < -10) {
        ballBody.position.set(0, 1, 0);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
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
