import { useRef, useEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";

const Goals = () => {
  const { incrementPlayerScore, incrementAIScore } = useGameState();
  const { addBody } = usePhysics();
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Repeat the wood texture
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 2);
  
  // Create goal collision handlers
  useEffect(() => {
    // Add goal trigger zones
    
    // Player's goal (at the bottom)
    addBody({
      position: [0, 1, 13],
      type: 'static',
      shape: 'box',
      width: 6,
      height: 2,
      depth: 0.2,
      isTrigger: true, // Make it a trigger zone
      userData: {
        type: 'goal',
        id: 'player_goal'
      },
      onCollide: (body) => {
        // If the ball enters player's goal, AI scores
        if (body.userData?.type === 'ball') {
          incrementAIScore();
          
          // Reset ball position
          body.position.set(0, 1, 0);
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);
        }
      }
    });
    
    // AI's goal (at the top)
    addBody({
      position: [0, 1, -13],
      type: 'static',
      shape: 'box',
      width: 6,
      height: 2,
      depth: 0.2,
      isTrigger: true, // Make it a trigger zone
      userData: {
        type: 'goal',
        goalId: 'ai_goal'
      },
      onCollide: (body) => {
        // If the ball enters AI's goal, player scores
        if (body.userData?.type === 'ball') {
          incrementPlayerScore();
          
          // Reset ball position
          body.position.set(0, 1, 0);
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);
        }
      }
    });
  }, [addBody, incrementAIScore, incrementPlayerScore]);
  
  return (
    <group>
      {/* Player's goal */}
      <Goal position={[0, 0, 12]} rotation={[0, 0, 0]} />
      
      {/* AI's goal */}
      <Goal position={[0, 0, -12]} rotation={[0, Math.PI, 0]} />
    </group>
  );
};

// Single goal component
const Goal = ({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) => {
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Set up goal boundaries with physics bodies
  useEffect(() => {
    // Goal physics bodies are added in the parent component
  }, []);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Beach umbrellas as goal posts */}
      <GoalPost position={[-3, 0, 0]} />
      <GoalPost position={[3, 0, 0]} />
      
      {/* Top crossbar */}
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[6.5, 0.3, 0.3]} />
        <meshStandardMaterial map={woodTexture} />
      </mesh>
      
      {/* Goal net */}
      <mesh position={[0, 1.5, -1]} rotation={[Math.PI/8, 0, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial 
          color="white" 
          opacity={0.3} 
          transparent 
          wireframe 
        />
      </mesh>
    </group>
  );
};

// Goal post (beach umbrella)
const GoalPost = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Umbrella pole */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
        <meshStandardMaterial color="#B0BEC5" />
      </mesh>
      
      {/* Umbrella top */}
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[1, 0.5, 16, 1, true]} />
        <meshStandardMaterial color="#E91E63" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default Goals;
