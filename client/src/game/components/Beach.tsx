import { useTexture } from "@react-three/drei";
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useFrame } from "@react-three/fiber";
import { FIELD_WIDTH, FIELD_DEPTH } from "../constants";

// Beach component with sand terrain and static palm trees
const Beach = () => {
  const sandTexture = useTexture("/textures/sand.jpg");
  const planeRef = useRef<THREE.Mesh>(null);
  const { addBody } = usePhysics();
  const groundBodyRef = useRef<any>(null);
  
  // Set texture repeat for better quality
  sandTexture.wrapS = THREE.RepeatWrapping;
  sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(8, 8);
  
  // Add palm trees in fixed positions (not randomized on rerenders)
  const palmTreesCount = 10;
  const palmTrees = useMemo(() => {
    return [...Array(palmTreesCount)].map((_, i) => {
      // Calculate fixed positions around the field perimeter
      const angle = (i / palmTreesCount) * Math.PI * 2;
      const radius = Math.max(FIELD_WIDTH, FIELD_DEPTH) * 0.8;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      // Use deterministic "random" values based on index
      const rotationY = ((i * 1.5) % 6.28); // Deterministic rotation
      const scale = 0.8 + ((i * 0.7) % 0.4); // Deterministic scale
      
      return {
        position: [x, 0, z] as [number, number, number],
        rotation: [0, rotationY, 0] as [number, number, number],
        scale
      };
    });
  }, []);
  
  // Initialize ground physics only once
  useEffect(() => {
    console.log("Creating ground physics body");
    
    // Create a static ground body for the beach
    const groundBody = addBody({
      position: [0, -0.25, 0],
      type: 'static',
      shape: 'plane',
      rotation: [-Math.PI / 2, 0, 0],
      material: {
        friction: 0.3,
        restitution: 0.2
      },
      userData: {
        type: 'ground',
        id: 'beach_ground'
      }
    });
    
    groundBodyRef.current = groundBody;
    
    // Add invisible boundary walls to keep players and ball in bounds
    const wallThickness = 1;
    const wallHeight = 5;
    
    // Left boundary
    addBody({
      position: [-FIELD_WIDTH/2 - wallThickness/2, wallHeight/2, 0],
      type: 'static',
      shape: 'box',
      width: wallThickness,
      height: wallHeight,
      depth: FIELD_DEPTH + wallThickness * 2,
      userData: { type: 'boundary', id: 'left_wall' }
    });
    
    // Right boundary
    addBody({
      position: [FIELD_WIDTH/2 + wallThickness/2, wallHeight/2, 0],
      type: 'static',
      shape: 'box',
      width: wallThickness,
      height: wallHeight,
      depth: FIELD_DEPTH + wallThickness * 2,
      userData: { type: 'boundary', id: 'right_wall' }
    });
    
    // Back boundary
    addBody({
      position: [0, wallHeight/2, FIELD_DEPTH/2 + wallThickness/2],
      type: 'static',
      shape: 'box',
      width: FIELD_WIDTH + wallThickness * 2,
      height: wallHeight,
      depth: wallThickness,
      userData: { type: 'boundary', id: 'back_wall' }
    });
    
    // Front boundary
    addBody({
      position: [0, wallHeight/2, -FIELD_DEPTH/2 - wallThickness/2],
      type: 'static',
      shape: 'box',
      width: FIELD_WIDTH + wallThickness * 2,
      height: wallHeight,
      depth: wallThickness,
      userData: { type: 'boundary', id: 'front_wall' }
    });
    
    // Add physics bodies for each palm tree (just the trunk)
    palmTrees.forEach((tree, index) => {
      const [x, y, z] = tree.position;
      
      addBody({
        position: [x, 2, z], // Position at trunk center
        type: 'static',
        shape: 'cylinder',
        radius: 0.3,
        height: 4,
        rotation: [0, 0, 0],
        userData: {
          type: 'tree',
          id: `palm_tree_${index}`
        }
      });
    });
  }, [addBody, palmTrees]);
  
  return (
    <group name="beach_environment">
      {/* Ground plane */}
      <mesh 
        ref={planeRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.25, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={sandTexture} />
      </mesh>
      
      {/* Field markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]}>
        <planeGeometry args={[FIELD_WIDTH, FIELD_DEPTH]} />
        <meshStandardMaterial color="#f5deb3" opacity={0.3} transparent />
      </mesh>
      
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]}>
        <ringGeometry args={[2, 2.1, 32]} />
        <meshStandardMaterial color="white" opacity={0.6} transparent />
      </mesh>
      
      {/* Field center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]}>
        <planeGeometry args={[0.1, FIELD_DEPTH]} />
        <meshStandardMaterial color="white" opacity={0.6} transparent />
      </mesh>
      
      {/* Palm trees - static objects */}
      {palmTrees.map((tree, index) => (
        <group 
          key={`palm_tree_${index}`}
          name={`palm_tree_${index}`}
          position={tree.position} 
          rotation={tree.rotation}
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
