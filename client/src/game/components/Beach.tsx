import { useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";

const Beach = () => {
  const sandTexture = useTexture("/textures/sand.jpg");
  const planeRef = useRef<THREE.Mesh>(null);
  const { addBody } = usePhysics();
  
  // Set texture repeat
  sandTexture.wrapS = THREE.RepeatWrapping;
  sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(8, 8);
  
  // Add palm trees
  const palmTreesCount = 10;
  const palmTrees = [...Array(palmTreesCount)].map((_, i) => {
    // Pre-calculate random positions around the field, not on the field
    const fieldWidth = 20;
    const fieldDepth = 30;
    const angle = (i / palmTreesCount) * Math.PI * 2;
    const radius = Math.max(fieldWidth, fieldDepth) * 0.8;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    
    return {
      position: [x, 0, z],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      scale: 0.8 + Math.random() * 0.4
    };
  });
  
  // Register ground plane with physics world
  const registerGroundBody = () => {
    if (planeRef.current) {
      // Create a static ground body
      addBody({
        position: [0, -0.25, 0],
        type: 'static',
        shape: 'plane',
        rotation: [-Math.PI / 2, 0, 0],
        userData: {
          type: 'ground'
        }
      });
    }
  };
  
  return (
    <group>
      {/* Ground plane */}
      <mesh 
        ref={planeRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.25, 0]}
        receiveShadow
        onAfterRender={registerGroundBody}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={sandTexture} />
      </mesh>
      
      {/* Field markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]}>
        <planeGeometry args={[20, 30]} />
        <meshStandardMaterial color="#f5deb3" opacity={0.3} transparent />
      </mesh>
      
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]}>
        <ringGeometry args={[2, 2.1, 32]} />
        <meshStandardMaterial color="white" opacity={0.6} transparent />
      </mesh>
      
      {/* Field center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]}>
        <planeGeometry args={[0.1, 30]} />
        <meshStandardMaterial color="white" opacity={0.6} transparent />
      </mesh>
      
      {/* Palm trees */}
      {palmTrees.map((tree, index) => (
        <group 
          key={index} 
          position={tree.position as [number, number, number]} 
          rotation={tree.rotation as [number, number, number]}
          scale={tree.scale}
        >
          {/* Palm tree trunk */}
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 4, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Palm tree leaves */}
          <group position={[0, 4, 0]}>
            {[...Array(7)].map((_, i) => {
              const angle = (i / 7) * Math.PI * 2;
              return (
                <mesh 
                  key={i} 
                  position={[
                    Math.sin(angle) * 0.5, 
                    0.2, 
                    Math.cos(angle) * 0.5
                  ]}
                  rotation={[
                    Math.PI * 0.15, 
                    0, 
                    angle
                  ]}
                  castShadow
                >
                  <coneGeometry args={[0.8, 2, 4]} />
                  <meshStandardMaterial color="#006400" />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
};

export default Beach;
