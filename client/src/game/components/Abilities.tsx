import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useAudio } from "@/lib/stores/useAudio";
import { FIELD_WIDTH, FIELD_DEPTH } from "../constants";

// Define the different types of crypto abilities
export type AbilityType = 'bitcoin' | 'ethereum' | 'dogecoin';

// Properties for each ability type
export const abilityData: Record<AbilityType, {
  title: string;
  description: string;
  color: string;
  symbol: string;
  duration: number;
  effect: string;
}> = {
  bitcoin: {
    title: 'Bitcoin Boost: Mine Your Way to Victory!',
    description: 'Increases movement speed by 50% for 5 seconds',
    color: '#f7931a', // Bitcoin gold
    symbol: '₿',
    duration: 5,
    effect: 'speed'
  },
  ethereum: {
    title: 'Ethereum Energizer: Smart Moves for Smart Players!',
    description: 'Enhances jump height by 75% for 5 seconds',
    color: '#627eea', // Ethereum blue
    symbol: 'Ξ',
    duration: 5,
    effect: 'jump'
  },
  dogecoin: {
    title: 'Dogecoin Dash: To the Moon and Back!',
    description: 'Grants temporary invincibility and speed boost for 3 seconds',
    color: '#c3a634', // Dogecoin yellow
    symbol: 'Ð',
    duration: 3,
    effect: 'invincibility'
  }
};

// Component to manage spawning and collecting abilities
const Abilities = () => {
  const [abilities, setAbilities] = useState<{id: string, type: AbilityType, position: THREE.Vector3}[]>([]);
  const { getBody } = usePhysics();
  const { playHit } = useAudio();
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCollectTimeRef = useRef(0);
  
  // Set up spawning of abilities at random intervals
  useEffect(() => {
    // Function to spawn a new ability
    const spawnAbility = () => {
      // Randomly choose ability type
      const abilityTypes: AbilityType[] = ['bitcoin', 'ethereum', 'dogecoin'];
      const randomType = abilityTypes[Math.floor(Math.random() * abilityTypes.length)];
      
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
      
      // Schedule next spawn in 20-30 seconds
      const nextSpawnTime = 20000 + Math.random() * 10000;
      spawnTimerRef.current = setTimeout(spawnAbility, nextSpawnTime);
    };
    
    // Start the first spawn after 10 seconds
    spawnTimerRef.current = setTimeout(spawnAbility, 10000);
    
    // Clean up timer on unmount
    return () => {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, []);
  
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
      
      // If player is close enough, collect the ability
      if (distance < 1.5) {
        // Play collection sound
        playHit();
        
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
      }
    });
  });
  
  return (
    <group>
      {/* Render each ability as a floating coin with effects */}
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

// Visual representation of a single ability item
const AbilityItem = ({ position, type }: { position: THREE.Vector3, type: AbilityType }) => {
  const itemRef = useRef<THREE.Group>(null);
  const [bobOffset, setBobOffset] = useState(0);
  const data = abilityData[type];
  
  // Animate the ability (rotation and bobbing)
  useFrame((_, delta) => {
    if (itemRef.current) {
      // Rotate the ability
      itemRef.current.rotation.y += delta * 1.5;
      
      // Bob up and down
      setBobOffset(prev => {
        const newOffset = prev + delta * 2;
        return newOffset % (Math.PI * 2);
      });
      
      // Apply bobbing motion
      itemRef.current.position.y = position.y + Math.sin(bobOffset) * 0.2;
    }
  });
  
  return (
    <group 
      ref={itemRef}
      position={position}
    >
      {/* Coin body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial 
          color={data.color}
          metalness={0.9}
          roughness={0.1}
          emissive={data.color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Glowing particles effect */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial 
          color={data.color} 
          transparent 
          opacity={0.15}
        />
      </mesh>
      
      {/* Symbol on the coin */}
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
          textShadow: '0 0 3px rgba(0,0,0,0.5)'
        }}>
          {data.symbol}
        </div>
      </Html>
      
      {/* Ability name tooltip */}
      <Html position={[0, 1, 0]} transform occlude>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
          width: '120px',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </div>
      </Html>
    </group>
  );
};

export default Abilities;