import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";
import { useCharacter } from "@/lib/stores/useCharacter";
import { characterData } from "../models/character";

// Character component that renders based on the selected character
const Characters = () => {
  const { playerScore, aiScore } = useGameState();
  const { selectedCharacter, isAbilityActive } = useCharacter();
  
  return (
    <group>
      {/* Player character */}
      <Character 
        type="player" 
        characterId={selectedCharacter} 
        position={[0, 0, 8]} 
        isAbilityActive={isAbilityActive}
        score={playerScore}
      />
      
      {/* AI character - always use Bitcoin for AI opponent */}
      <Character 
        type="ai" 
        characterId="bitcoin" 
        position={[0, 0, -8]} 
        isAbilityActive={false}
        score={aiScore}
      />
    </group>
  );
};

// Single character with physics body
const Character = ({ 
  type, 
  characterId,
  position, 
  isAbilityActive,
  score
}: { 
  type: "player" | "ai";
  characterId: string;
  position: [number, number, number];
  isAbilityActive: boolean;
  score: number;
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const { addBody, getBody, removeBody } = usePhysics();
  const bodyId = `${type}_character`;
  
  const character = characterData[characterId];
  
  // Get character colors based on id
  const getCharacterColor = () => {
    switch (characterId) {
      case 'bitcoin':
        return '#f7931a'; // Bitcoin gold
      case 'ethereum':
        return '#627eea'; // Ethereum blue/purple
      case 'dogecoin':
        return '#c2a633'; // Dogecoin yellow
      case 'pepecoin':
        return '#3cbc98'; // PepeCoin green
      default:
        return '#888888';
    }
  };
  
  // Get character body color
  const getBodyColor = () => {
    switch (characterId) {
      case 'bitcoin':
        return '#ff8c00'; // Orange swim trunks
      case 'ethereum':
        return '#9370db'; // Purple bikini
      case 'dogecoin':
        return '#ff4500'; // Red swimsuit
      case 'pepecoin':
        return '#2e8b57'; // Green swimsuit
      default:
        return '#888888';
    }
  };
  
  // Create the character physics body
  useEffect(() => {
    if (meshRef.current) {
      // Create character body
      addBody({
        position,
        mass: 5,
        shape: 'capsule',
        height: 1.5,
        radius: 0.5,
        material: {
          friction: 0.5,
          restitution: 0.2
        },
        fixedRotation: true, // Keep character upright
        linearDamping: 0.9, // Add resistance to movement
        userData: {
          type: 'character',
          bodyId,
          characterType: type
        }
      });
    }
    
    return () => {
      // Clean up on unmount
      removeBody(bodyId);
    };
  }, [addBody, bodyId, position, removeBody, type]);
  
  // Update the character mesh with physics body position
  useFrame(() => {
    const characterBody = getBody(bodyId);
    if (characterBody && meshRef.current) {
      const position = characterBody.position;
      
      // Update mesh position
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y;
      meshRef.current.position.z = position.z;
      
      // Determine facing direction (player always faces up, AI always faces down)
      if (type === 'player') {
        meshRef.current.rotation.y = Math.PI; // Player faces opponent
      } else {
        meshRef.current.rotation.y = 0; // AI faces player
      }
    }
  });
  
  return (
    <group ref={meshRef} position={position}>
      {/* Character body - capsule shape */}
      <group>
        {/* Large coin head */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 0.2, 32]} />
          <meshStandardMaterial 
            color={getCharacterColor()} 
            metalness={0.8}
            roughness={0.2}
          />
          
          {/* Character symbol */}
          <Html position={[0, 0, 0.11]} transform occlude>
            <div style={{ 
              fontSize: '24px', 
              color: 'white', 
              fontWeight: 'bold',
              textShadow: '0 0 3px rgba(0,0,0,0.5)',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {characterId === 'bitcoin' && '₿'}
              {characterId === 'ethereum' && 'Ξ'}
              {characterId === 'dogecoin' && 'Ð'}
              {characterId === 'pepecoin' && '🐸'}
            </div>
          </Html>
        </mesh>
        
        {/* Body (torso) */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <capsuleGeometry args={[0.3, 1, 16, 16]} />
          <meshStandardMaterial color={getBodyColor()} />
        </mesh>
        
        {/* Arms */}
        <mesh position={[0.4, 0.7, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.7, 16, 16]} rotation={[0, 0, Math.PI/2]} />
          <meshStandardMaterial color="#ffdbac" /> {/* Skin tone */}
        </mesh>
        <mesh position={[-0.4, 0.7, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.7, 16, 16]} rotation={[0, 0, -Math.PI/2]} />
          <meshStandardMaterial color="#ffdbac" /> {/* Skin tone */}
        </mesh>
        
        {/* Legs */}
        <mesh position={[0.2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
          <meshStandardMaterial color={getBodyColor()} />
        </mesh>
        <mesh position={[-0.2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
          <meshStandardMaterial color={getBodyColor()} />
        </mesh>
      </group>
      
      {/* Ability effect when active */}
      {isAbilityActive && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshStandardMaterial 
            color={getCharacterColor()}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Player name and score label */}
      <Html position={[0, 2.5, 0]} transform occlude>
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
          transform: 'translate(-50%, 0)',
          whiteSpace: 'nowrap'
        }}>
          {type === 'player' ? 'Player' : 'AI'} ({character.name})
          <br />
          Score: {score}
        </div>
      </Html>
    </group>
  );
};

export default Characters;
