import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";
import { useCharacter } from "@/lib/stores/useCharacter";
import { useAudio } from "@/lib/stores/useAudio";
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
        characterId="beachbaddy" 
        position={[0, 0, -8]} 
        isAbilityActive={false}
        score={aiScore}
      />
    </group>
  );
};

// 3D model loader component
const ModelLoader = ({ modelPath, characterId }: { modelPath: string, characterId: string }) => {
  const gltf = useGLTF(`/models/characters/${modelPath}`);
  
  useEffect(() => {
    // Add shadows to all meshes in the model
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [gltf]);

  // Position adjustment for 3D human models
  const positionY = characterId === 'gigachad' || characterId === 'beachbaddy' ? 0.8 : 0;

  return <primitive object={gltf.scene} scale={1} position={[0, positionY, 0]} />;
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
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const { addBody, getBody, removeBody } = usePhysics();
  const bodyId = `${type}_character`;
  const { playHit } = useAudio();
  
  // State for kick animation
  const [isKicking, setIsKicking] = useState(false);
  const kickTimer = useRef(0);
  const kickLegRef = useRef<THREE.Mesh | null>(null);
  
  const character = characterData[characterId];
  const is3DModel = Boolean(character?.model);
  
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
      case 'gigachad':
        return '#ff6347'; // Tomato red
      case 'beachbaddy':
        return '#ff69b4'; // Hot pink
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
      case 'gigachad':
        return '#0077be'; // Blue swim trunks
      case 'beachbaddy':
        return '#ff1493'; // Pink bikini
      default:
        return '#888888';
    }
  };
  
  // Setup keyboard controls for kick animation (player only)
  useEffect(() => {
    if (type === 'player') {
      // Listen for kick button press
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !isKicking && kickTimer.current <= 0) {
          setIsKicking(true);
          kickTimer.current = 0.3; // Animation duration in seconds
          kickLegRef.current = Math.random() > 0.5 ? leftLegRef.current : rightLegRef.current;
          console.log("👟 Kick animation triggered");
          
          // Check if near ball to play sound
          const playerBody = getBody(bodyId);
          const ballBody = getBody('ball');
          
          if (playerBody && ballBody) {
            const playerPos = playerBody.position;
            const ballPos = ballBody.position;
            const dx = ballPos.x - playerPos.x;
            const dy = ballPos.y - playerPos.y;
            const dz = ballPos.z - playerPos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance < 3) {
              playHit();
            }
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [type, isKicking, bodyId, getBody, playHit]);
  
  // Create the character physics body ONLY ONCE
  useEffect(() => {
    // Use a ref to track if we've already created this body
    const existingBody = getBody(bodyId);
    
    if (!existingBody && meshRef.current) {
      console.log('Creating character physics body', bodyId);
      // Create character body
      const body = addBody({
        position,
        mass: 5,
        shape: 'cylinder', // Using cylinder instead of capsule
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
          id: bodyId,
          characterType: type
        }
      });
      console.log('Character body created:', !!body);
    } else if (existingBody) {
      console.log(`Character body ${bodyId} already exists, skipping creation`);
    }
    
    return () => {
      // Clean up on unmount
      console.log(`Removing character body ${bodyId}`);
      removeBody(bodyId);
    };
  // Important: Remove position from dependencies to prevent recreation on position change
  }, [addBody, bodyId, getBody, removeBody, type]);
  
  // Update the character mesh with physics body position
  useFrame((_, delta) => {
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
    
    // Handle kick animation
    if (isKicking && kickTimer.current > 0) {
      if (kickLegRef.current) {
        // Get the kicking leg
        const kickingLeg = kickLegRef.current;
        
        // Forward kick animation - extend leg forward
        const kickProgress = 1 - (kickTimer.current / 0.3); // 0 to 1 progress
        
        // Create dynamic kicking motion
        const initialZ = type === 'player' ? -0.2 : 0.2;
        const kickDirection = type === 'player' ? -1 : 1; // Kick direction based on character type
        
        // Apply kick animation
        kickingLeg.position.z = initialZ + (kickDirection * Math.sin(kickProgress * Math.PI) * 0.7);
        kickingLeg.position.y = -0.2 + Math.sin(kickProgress * Math.PI) * 0.3; // Lift slightly
        
        // Make the kicking leg visually distinct during kick
        if (kickingLeg.material) {
          const material = kickingLeg.material as THREE.MeshStandardMaterial;
          material.emissive.setRGB(0.5, 0.5, 0.5);
        }
        
        // Decrease timer
        kickTimer.current -= delta;
        
        // Reset when animation is complete
        if (kickTimer.current <= 0) {
          setIsKicking(false);
          kickingLeg.position.z = initialZ;
          kickingLeg.position.y = -0.2;
          
          // Reset material
          if (kickingLeg.material) {
            const material = kickingLeg.material as THREE.MeshStandardMaterial;
            material.emissive.setRGB(0, 0, 0);
          }
        }
      }
    }
  });
  
  return (
    <group ref={meshRef} position={position}>
      {is3DModel ? (
        // Render 3D GLB model for new characters
        <Suspense fallback={null}>
          <group scale={1.5}>
            <ModelLoader modelPath={character.model!} characterId={characterId} />
          </group>
        </Suspense>
      ) : (
        // Render coin-based character for crypto characters
        <group>
          {/* Large coin head */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[1, 1, 0.2, 32]} />
            <meshStandardMaterial 
              color={getCharacterColor()} 
              metalness={0.8}
              roughness={0.2}
            />
            
            {/* Floating Crypto Coin above head */}
            <group position={[0, 0.7, 0]} rotation={[0, 0, 0]}>
              {/* Animated floating coin */}
              <mesh castShadow position={[0, Math.sin(Date.now() * 0.003) * 0.1, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
                <meshStandardMaterial 
                  color={characterId === 'bitcoin' ? '#f7931a' : 
                        characterId === 'ethereum' ? '#627eea' :
                        characterId === 'dogecoin' ? '#c3a634' :
                        '#44be5a'} 
                  metalness={0.9}
                  roughness={0.1}
                  emissive={characterId === 'bitcoin' ? '#f7931a' : 
                          characterId === 'ethereum' ? '#627eea' :
                          characterId === 'dogecoin' ? '#c3a634' :
                          '#44be5a'}
                  emissiveIntensity={0.2}
                />
              </mesh>
            </group>
            
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
          <group position={[0.4, 0.7, 0]} rotation={[0, 0, Math.PI/2]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.1, 0.7, 16, 16]} />
              <meshStandardMaterial color="#ffdbac" /> {/* Skin tone */}
            </mesh>
          </group>
          <group position={[-0.4, 0.7, 0]} rotation={[0, 0, -Math.PI/2]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.1, 0.7, 16, 16]} />
              <meshStandardMaterial color="#ffdbac" /> {/* Skin tone */}
            </mesh>
          </group>
          
          {/* Legs with refs for kick animation */}
          <mesh 
            ref={leftLegRef} 
            position={[0.2, 0, 0]} 
            castShadow
          >
            <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
            <meshStandardMaterial color={getBodyColor()} />
          </mesh>
          <mesh 
            ref={rightLegRef} 
            position={[-0.2, 0, 0]} 
            castShadow
          >
            <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
            <meshStandardMaterial color={getBodyColor()} />
          </mesh>
        </group>
      )}
      
      {/* Ability effect when active */}
      {isAbilityActive && (
        <group>
          {/* Different ability effects based on character */}
          {characterId === 'gigachad' ? (
            // Womanizer effect
            <>
              <mesh position={[0, 1, 0]}>
                <sphereGeometry args={[1.5, 24, 24]} />
                <meshBasicMaterial color="#ff6347" transparent opacity={0.2} />
              </mesh>
              <pointLight position={[0, 1, 0]} intensity={2} distance={5} color="#ff6347" />
              {/* Heart particles */}
              {[...Array(8)].map((_, i) => (
                <mesh key={i} position={[
                  Math.sin(Date.now() * 0.001 + i) * 2, 
                  1.5 + Math.cos(Date.now() * 0.002 + i) * 0.5, 
                  Math.cos(Date.now() * 0.001 + i) * 2
                ]}>
                  <sphereGeometry args={[0.1, 8, 8]} />
                  <meshBasicMaterial color="#ff69b4" />
                </mesh>
              ))}
            </>
          ) : characterId === 'beachbaddy' ? (
            // Captivating Presence effect
            <>
              <mesh position={[0, 1, 0]}>
                <sphereGeometry args={[1.5, 24, 24]} />
                <meshBasicMaterial color="#ff69b4" transparent opacity={0.2} wireframe />
              </mesh>
              <pointLight position={[0, 1, 0]} intensity={2.5} distance={6} color="#ff69b4" />
              {/* Dazzling stars */}
              {[...Array(10)].map((_, i) => (
                <sprite key={i} position={[
                  Math.sin(Date.now() * 0.002 + i * 0.5) * 2,
                  1.5 + Math.cos(Date.now() * 0.001 + i * 0.7) * 0.7,
                  Math.sin(Date.now() * 0.0015 + i * 0.3) * 2
                ]} scale={[0.3, 0.3, 0.3]}>
                  <spriteMaterial color="white" transparent opacity={0.8} />
                </sprite>
              ))}
            </>
          ) : (
            // Default effect for crypto characters
            <mesh position={[0, 1, 0]}>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshStandardMaterial 
                color={getCharacterColor()}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </group>
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
