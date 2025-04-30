import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useAudio } from "@/lib/stores/useAudio";
import { FIELD_WIDTH, FIELD_DEPTH } from "../constants";

// Define the different types of crypto abilities
export type AbilityType = 'bitcoin' | 'ethereum' | 'dogecoin' | 'pepecoin';

// Properties for each ability type with significantly enhanced effects
export const abilityData: Record<AbilityType, {
  title: string;
  description: string;
  color: string;
  symbol: string;
  duration: number;
  effect: string;
}> = {
  bitcoin: {
    title: 'HODL: The Diamond Hands Upgrade',
    description: 'Dramatically increases kick power (150%) and ball control radius for crushing goals',
    color: '#f7931a', // Bitcoin gold
    symbol: '₿',
    duration: 7, // Increased duration from 5s to 7s
    effect: 'kick_power'
  },
  ethereum: {
    title: 'Smart Contract: Gas Fee Turbocharger',
    description: 'Massively enhances jump height (150%) and provides a 50% speed boost',
    color: '#627eea', // Ethereum blue
    symbol: 'Ξ',
    duration: 7, // Increased duration from 5s to 7s
    effect: 'jump_boost'
  },
  dogecoin: {
    title: 'To The Moon: Lunar Gravity Edition',
    description: 'Grants temporary invincibility, 120% speed boost, and enhanced kicking',
    color: '#c3a634', // Dogecoin yellow
    symbol: 'Ð',
    duration: 5, // Increased duration from 3s to 5s
    effect: 'invincibility'
  },
  pepecoin: {
    title: 'Meme Magic: The Rare Pepe Power',
    description: 'Enhances ALL abilities by 80% for the ultimate crypto champion experience',
    color: '#5cb85c', // Pepe green
    symbol: '🐸',
    duration: 6, // New duration of 6s
    effect: 'all_stats'
  }
};

// Maximum number of abilities allowed on field at once - increased for more excitement
const MAX_ABILITIES = 2; // Increased from 2 to 3

// Component to manage spawning and collecting abilities
const Abilities = () => {
  const [abilities, setAbilities] = useState<{id: string, type: AbilityType, position: THREE.Vector3}[]>([]);
  const { getBody } = usePhysics();
  const { playHit, playSuccess } = useAudio();
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCollectTimeRef = useRef(0);
  
  // Set up spawning of abilities at random intervals
  useEffect(() => {
    // Function to spawn a new ability
    const spawnAbility = () => {
      // Don't spawn if we already have the maximum abilities
      if (abilities.length >= MAX_ABILITIES) {
        console.log(`🪙 Maximum abilities (${MAX_ABILITIES}) already on field. Waiting for collection.`);
        // Schedule next spawn check in 10-15 seconds (increased wait time)
        spawnTimerRef.current = setTimeout(spawnAbility, 10000 + Math.random() * 5000);
        return;
      }
      
      // Randomly choose ability type with Pepecoin now possible
      const abilityTypes: AbilityType[] = ['bitcoin', 'ethereum', 'dogecoin', 'pepecoin'];
      
      // Make pepecoin rarer (only 15% chance)
      const randomValue = Math.random();
      let randomType: AbilityType;
      
      if (randomValue < 0.15) {
        randomType = 'pepecoin'; // 15% chance for rare pepecoin
      } else {
        // For the remaining 85%, choose evenly between the other three
        const otherTypes: AbilityType[] = ['bitcoin', 'ethereum', 'dogecoin'];
        randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
      }
      
      // Generate random position on the field, but not too close to goals
      const halfWidth = FIELD_WIDTH / 2 - 2;
      const halfDepth = FIELD_DEPTH / 2 - 4;
      
      const randomX = (Math.random() * 2 - 1) * halfWidth;
      const randomZ = (Math.random() * 2 - 1) * halfDepth;
      
      // Create new ability with unique ID
      const newAbility = {
        id: `ability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: randomType,
        position: new THREE.Vector3(randomX, 1, randomZ)
      };
      
      // Add to abilities array
      setAbilities(prev => [...prev, newAbility]);
      
      console.log(`🪙 Spawned ${randomType} ability at`, newAbility.position);
      console.log(`Current abilities on field: ${abilities.length + 1}/${MAX_ABILITIES}`);
      
      // Schedule next spawn in 20-30 seconds (significantly increased from 8-15 seconds)
      // Only if we're below max capacity
      if (abilities.length < MAX_ABILITIES - 1) {
        const nextSpawnTime = 20000 + Math.random() * 10000;
        spawnTimerRef.current = setTimeout(spawnAbility, nextSpawnTime);
      } else {
        // If we've reached max capacity, check again later
        spawnTimerRef.current = setTimeout(spawnAbility, 15000 + Math.random() * 10000);
      }
    };
    
    // Start the first spawn after 15 seconds (increased from 5 seconds)
    spawnTimerRef.current = setTimeout(spawnAbility, 15000);
    
    // Clean up timer on unmount
    return () => {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [abilities.length]);
  
  // Check for collisions between player and abilities
  useFrame(() => {
    // Skip if too soon after last collection (prevent multiple rapid collections)
    if (Date.now() - lastCollectTimeRef.current < 500) return;
    
    // Don't check if no abilities exist
    if (abilities.length === 0) return;
    
    const playerBody = getBody('player_character');
    if (!playerBody) return;
    
    const playerPosition = new THREE.Vector3(
      playerBody.position.x,
      playerBody.position.y,
      playerBody.position.z
    );
    
    // Check each ability for collision with player
    abilities.forEach(ability => {
      const distance = playerPosition.distanceTo(ability.position);
      
      // If player is close enough, collect the ability with improved collection radius
      if (distance < 2.0) { // Increased from 1.5 to 2.0 for easier collection
        // Play collection sound
        playSuccess(); // Changed to success sound instead of hit
        
        // Notify about ability collection
        console.log(`🎮 Collected ${ability.type} ability!`);
        
        // Custom event to trigger ability effect
        window.dispatchEvent(new CustomEvent('ability-collected', {
          detail: {
            type: ability.type,
            data: abilityData[ability.type]
          }
        }));
        
        // Remove this ability from the list
        setAbilities(prev => prev.filter(a => a.id !== ability.id));
        
        // Set cooldown to prevent multiple rapid collections
        lastCollectTimeRef.current = Date.now();
        
        // Spawn a new ability after collection
        // We do this by scheduling a new spawn check
        if (spawnTimerRef.current) {
          clearTimeout(spawnTimerRef.current);
        }
        
        // Check for new spawn in 15-25 seconds after collection (significantly increased)
        spawnTimerRef.current = setTimeout(() => {
          // This function will check if we're below max and spawn if needed
          const spawnAbility = () => {
            if (abilities.length < MAX_ABILITIES) {
              // Randomly choose ability type with Pepecoin now possible
              const abilityTypes: AbilityType[] = ['bitcoin', 'ethereum', 'dogecoin', 'pepecoin'];
              
              // Same rarity logic as before
              const randomValue = Math.random();
              let randomType: AbilityType;
              
              if (randomValue < 0.15) {
                randomType = 'pepecoin'; // 15% chance for rare pepecoin
              } else {
                const otherTypes: AbilityType[] = ['bitcoin', 'ethereum', 'dogecoin'];
                randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
              }
              
              // Generate random position on the field, but not too close to goals or player
              const halfWidth = FIELD_WIDTH / 2 - 2;
              const halfDepth = FIELD_DEPTH / 2 - 4;
              
              let randomX, randomZ, position;
              let tooCloseToPlayer = true;
              
              // Keep generating positions until we find one not too close to player
              while (tooCloseToPlayer) {
                randomX = (Math.random() * 2 - 1) * halfWidth;
                randomZ = (Math.random() * 2 - 1) * halfDepth;
                position = new THREE.Vector3(randomX, 1, randomZ);
                
                // Check distance to player
                const distToPlayer = position.distanceTo(playerPosition);
                tooCloseToPlayer = distToPlayer < 5; // Don't spawn too close to player
              }
              
              // Create new ability with unique ID
              const newAbility = {
                id: `ability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: randomType,
                position: new THREE.Vector3(randomX, 1, randomZ)
              };
              
              // Add to abilities array
              setAbilities(prev => [...prev, newAbility]);
              
              console.log(`🪙 Spawned replacement ${randomType} ability at`, newAbility.position);
              console.log(`Current abilities on field: ${abilities.length + 1}/${MAX_ABILITIES}`);
            }
          };
          
          spawnAbility();
        }, 15000 + Math.random() * 10000); // Significantly increased from 2-4s to 15-25s
      }
    });
  });
  
  return (
    <group>
      {/* Render each ability as a floating coin with enhanced effects */}
      {abilities.map(ability => (
        <AbilityItem 
          key={ability.id}
          position={ability.position}
          type={ability.type}
        />
      ))}
    </group>
  );
};

// Visual representation of a single ability item with enhanced visual effects
const AbilityItem = ({ position, type }: { position: THREE.Vector3, type: AbilityType }) => {
  const itemRef = useRef<THREE.Group>(null);
  const [bobOffset, setBobOffset] = useState(0);
  const data = abilityData[type];
  const glowRef = useRef<THREE.Mesh>(null);
  const [pulseScale, setPulseScale] = useState(1);
  const [rotationSpeed, setRotationSpeed] = useState(1.5);
  
  // Animate the ability (rotation and bobbing) with enhanced animations
  useFrame((_, delta) => {
    if (itemRef.current) {
      // Rotate the ability - each type has a different rotation style
      if (type === 'pepecoin') {
        // Pepecoin has a more erratic, meme-like rotation
        itemRef.current.rotation.y += delta * (2.5 + Math.sin(Date.now() * 0.001) * 0.5);
        itemRef.current.rotation.z = Math.sin(Date.now() * 0.0015) * 0.15;
      } else {
        // Other coins rotate at their specific speed
        itemRef.current.rotation.y += delta * rotationSpeed;
      }
      
      // Bob up and down with enhanced motion
      setBobOffset(prev => {
        const newOffset = prev + delta * (type === 'dogecoin' ? 3 : 2); // Dogecoin bobs faster
        return newOffset % (Math.PI * 2);
      });
      
      // Apply bobbing motion with type-specific amplitude
      const bobAmplitude = type === 'pepecoin' ? 0.3 : 0.2;
      itemRef.current.position.y = position.y + Math.sin(bobOffset) * bobAmplitude;
      
      // Pulsing glow effect
      if (glowRef.current) {
        // Update pulse scale with smooth sine wave
        setPulseScale(1 + Math.sin(Date.now() * 0.003) * 0.2);
        
        // Apply scale to glow sphere
        glowRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      }
    }
  });
  
  // Different rotation speeds for different coins
  useEffect(() => {
    switch (type) {
      case 'bitcoin':
        setRotationSpeed(1.3);
        break;
      case 'ethereum':
        setRotationSpeed(1.7);
        break;
      case 'dogecoin':
        setRotationSpeed(2.2); // Dogecoin spins faster
        break;
      case 'pepecoin':
        setRotationSpeed(1.1); // Pepecoin has variable speed (handled in useFrame)
        break;
    }
  }, [type]);
  
  return (
    <group 
      ref={itemRef}
      position={position}
    >
      {/* Outer glow effect - larger and more dramatic */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial 
          color={data.color} 
          transparent 
          opacity={0.15}
        />
      </mesh>
      
      {/* Inner glow effect */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial 
          color={data.color} 
          transparent 
          opacity={0.25}
        />
      </mesh>
      
      {/* Coin body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial 
          color={data.color}
          metalness={0.9}
          roughness={0.1}
          emissive={data.color}
          emissiveIntensity={0.5} // Increased from 0.3 for more glow
        />
      </mesh>
      
      {/* Dynamic light source to illuminate nearby objects */}
      <pointLight
        color={data.color}
        intensity={0.8}
        distance={4}
        decay={2}
      />
      
      {/* Symbol on the coin with enhanced styling */}
      <Html position={[0, 0, 0.06]} transform occlude>
        <div style={{ 
          fontSize: '32px', 
          color: 'white', 
          fontWeight: 'bold',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textShadow: '0 0 5px rgba(0,0,0,0.7)',
          filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.7))'
        }}>
          {data.symbol}
        </div>
      </Html>
      
      {/* Ability name tooltip with enhanced styling */}
      <Html position={[0, 1, 0]} transform occlude>
        <div style={{
          background: `rgba(0,0,0,0.7)`,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
          width: '140px',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          border: `1px solid ${data.color}`,
          boxShadow: `0 0 10px ${data.color}`
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {type.charAt(0).toUpperCase() + type.slice(1)} Power
          </div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>
            {data.duration}s boost
          </div>
        </div>
      </Html>
    </group>
  );
};

export default Abilities;