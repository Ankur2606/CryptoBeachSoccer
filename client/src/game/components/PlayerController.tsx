import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@/lib/hooks/useKeyboardControls";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useCharacter } from "@/lib/stores/useCharacter";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState } from "@/lib/stores/useGameState";
import { Vector3 } from "three";
import { MOVE_SPEED, JUMP_FORCE, KICK_POWER } from "../constants";
import { AbilityType } from "./Abilities";

// Player controller handles input and character movement
const PlayerController = ({ character }: { character: string }) => {
  const [subscribeKeys, getKeys] = useKeyboardControls();
  const { getBody, applyForce } = usePhysics();
  const { activateAbility, isAbilityActive, cooldownRemaining } = useCharacter();
  const { playHit, playSuccess } = useAudio();
  const { gameState } = useGameState();
  
  // Active crypto ability states
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [abilityTimeRemaining, setAbilityTimeRemaining] = useState(0);
  
  // Speed/jump multipliers for abilities
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [jumpMultiplier, setJumpMultiplier] = useState(1.0);
  const [isInvincible, setIsInvincible] = useState(false);
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const direction = useRef(new Vector3());
  const isOnGroundRef = useRef(true);
  const frameCount = useRef(0);
  const abilityEffectRef = useRef<NodeJS.Timeout | null>(null);
  
  // Log when component mounts and set up ability listeners
  useEffect(() => {
    console.log("PlayerController mounted for character:", character);
    
    // Debug keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("Key down:", e.code);
    };
    
    // Add debug event listener
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    // Handle ability collection event
    const handleAbilityCollected = (event: Event) => {
      const customEvent = event as CustomEvent<{type: AbilityType, data: any}>;
      const abilityType = customEvent.detail.type;
      const abilityData = customEvent.detail.data;
      
      console.log(`🪙 Collected ${abilityType} ability!`);
      playSuccess();
      
      // Apply the ability effect
      applyAbilityEffect(abilityType, abilityData.duration);
    };
    
    // Add event listener for ability collection
    window.addEventListener('ability-collected', handleAbilityCollected);
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      window.removeEventListener('ability-collected', handleAbilityCollected);
      
      // Clean up any active ability effects on unmount
      if (abilityEffectRef.current) {
        clearTimeout(abilityEffectRef.current);
      }
    };
  }, [character, playSuccess]);
  
  // Apply the specific crypto ability effect
  const applyAbilityEffect = (type: AbilityType, duration: number) => {
    // Clear any existing effects
    if (abilityEffectRef.current) {
      clearTimeout(abilityEffectRef.current);
    }
    
    // Set the active ability
    setActiveAbility(type);
    setAbilityTimeRemaining(duration);
    
    // Apply effects based on ability type
    switch (type) {
      case 'bitcoin':
        // Bitcoin boosts speed
        console.log("🚀 Bitcoin Boost activated! Speed increased by 50%");
        setSpeedMultiplier(1.5);
        break;
      
      case 'ethereum':
        // Ethereum boosts jump height
        console.log("🦘 Ethereum Energizer activated! Jump height increased by 75%");
        setJumpMultiplier(1.75);
        break;
      
      case 'dogecoin':
        // Dogecoin gives temporary invincibility and speed
        console.log("⚡ Dogecoin Dash activated! Temporary invincibility and speed boost");
        setIsInvincible(true);
        setSpeedMultiplier(1.7);
        break;
    }
    
    // Set timeout to end the effect
    abilityEffectRef.current = setTimeout(() => {
      console.log(`Ability ${type} effect ended`);
      setActiveAbility(null);
      setAbilityTimeRemaining(0);
      setSpeedMultiplier(1.0);
      setJumpMultiplier(1.0);
      setIsInvincible(false);
      
      abilityEffectRef.current = null;
    }, duration * 1000);
  };
  
  // Process input and move character each frame
  useFrame((state, delta) => {
    // Increment the frame counter
    frameCount.current += 1;
    
    // Don't process input if game is over
    if (gameState !== 'playing') return;
    
    const playerBody = getBody('player_character');
    if (!playerBody) {
      console.log("Player body not found");
      return;
    }
    
    // Get current key states - these are defined as:
    // - left: A or Left Arrow (move left)
    // - right: D or Right Arrow (move right)
    // - jump: W or Up Arrow (jump)
    // - kick: Space bar (kick the ball)
    // - ability: E or Shift (use character's special ability)
    const keys = getKeys();
    
    // Log key states every few seconds (not on every frame to reduce spam)
    if (frameCount.current % 60 === 0) {
      const activeKeys = Object.entries(keys)
        .filter(([_, pressed]) => pressed)
        .map(([key]) => key);
      
      if (activeKeys.length > 0) {
        console.log("Active controls:", activeKeys.join(', '));
      }
    }
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    
    // Movement - use stronger forces and direct velocity manipulation for responsiveness
    // Apply ability speed multiplier if active
    const moveSpeed = MOVE_SPEED * 15 * speedMultiplier; // Scale up for better responsiveness
    
    // Update ability time remaining if active
    if (activeAbility) {
      setAbilityTimeRemaining(prev => Math.max(0, prev - delta));
      
      // Visual indicator for active ability (log occasionally)
      if (frameCount.current % 30 === 0) {
        console.log(`${activeAbility.toUpperCase()} ability active for ${abilityTimeRemaining.toFixed(1)}s`);
      }
    }
    
    direction.current.set(0, 0, 0);
    
    // MOVEMENT: WASD or Arrow Keys
    // Horizontal movement (left/right)
    if (keys.left) {
      direction.current.x = -1;
      // Only log occasionally
      if (frameCount.current % 60 === 0) console.log("Moving LEFT using A or ←");
    }
    if (keys.right) {
      direction.current.x = 1;
      // Only log occasionally
      if (frameCount.current % 60 === 0) console.log("Moving RIGHT using D or →");
    }
    
    // Forward/backward movement (W/S keys)
    if (keys.forward) {
      // W key moves forward on the field (toward opponent's goal)
      direction.current.z = -1;
      if (frameCount.current % 60 === 0) console.log("Moving FORWARD using W or ↑");
    }
    
    // S key moves backward
    if (keys.backward) {
      // S key moves backward (toward player's goal)
      direction.current.z = 1;
      if (frameCount.current % 60 === 0) console.log("Moving BACKWARD using S or ↓");
    }
    
    // Check if character is on ground for jumping
    isOnGroundRef.current = playerBody.position.y < 0.6;
    
    // Apply movement force with smoothing for better control
    if (direction.current.length() > 0) {
      // IMPORTANT: For extremely responsive movement, we use direct velocity manipulation
      // with a bit of inertia to avoid abrupt stops and starts
      const desiredVelocityX = direction.current.x * 10; // Target velocity for X-axis
      
      // Adjust Z-axis velocity based on forward/backward direction
      // Use faster backward movement (increased from 8 to 12)
      const desiredVelocityZ = direction.current.z > 0 
        ? direction.current.z * 12  // Backward (S key) - increased speed
        : direction.current.z * 8;  // Forward (W key)
      
      // Blend current and desired velocity (smaller first number = more responsive)
      playerBody.velocity.x = playerBody.velocity.x * 0.2 + desiredVelocityX * 0.8;
      playerBody.velocity.z = playerBody.velocity.z * 0.2 + desiredVelocityZ * 0.8;
      
      // Also apply force for additional acceleration
      const force = new Vector3()
        .copy(direction.current)
        .normalize()
        .multiplyScalar(moveSpeed * playerBody.mass * delta * 60);
      
      applyForce(playerBody, [force.x, 0, force.z]);
      
      // Log player position for debugging
      if (frameCount.current % 60 === 0) {
        console.log("Player position:", playerBody.position);
      }
    } else {
      // Apply strong damping when not pressing movement keys for tight stops
      playerBody.velocity.x *= 0.7;
      playerBody.velocity.z *= 0.7; 
    }
    
    // Separate the jump logic from forward movement
    // Jump (only when on ground and W/Up is pressed)
    if (keys.jump && isOnGroundRef.current && jumpCooldownRef.current <= 0) {
      // Apply jump multiplier from ability if active
      const jumpForce = JUMP_FORCE * 20 * playerBody.mass * jumpMultiplier; // Scale for better jump
      applyForce(playerBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.3; // Shorter cooldown for responsive jumps
      
      // Log jump with different message if enhanced by ability
      if (jumpMultiplier > 1.0) {
        console.log(`💫 Enhanced jump applied with force ${jumpForce.toFixed(1)} (${Math.round((jumpMultiplier-1)*100)}% boost)`);
      } else {
        console.log("Jump applied", jumpForce);
      }
    }
    
    // Display key mapping info occasionally for debugging
    if (frameCount.current % 600 === 0) {
      console.log(`🎮 CONTROLS: 
        WASD/Arrows: Move character
        W/Up: Move forward and Jump
        S/Down: Move backward
        A/Left, D/Right: Move left/right
        Space: Kick the ball
        E/Shift: Use special ability`);
    }
    
    // Kick the ball with spacebar
    if (keys.kick && kickCooldownRef.current <= 0) {
      const ballBody = getBody('ball');
      if (ballBody) {
        // Calculate distance to ball
        const playerPos = playerBody.position;
        const ballPos = ballBody.position;
        const dx = ballPos.x - playerPos.x;
        const dy = ballPos.y - playerPos.y;
        const dz = ballPos.z - playerPos.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Only kick if ball is within range (increased range for better gameplay)
        if (distance < 4) {
          // Get player's facing direction based on recent movement
          const playerDir = new Vector3(
            playerBody.velocity.x, 
            0, 
            playerBody.velocity.z
          ).normalize();
          
          // If player is not moving, kick toward opponent's goal
          if (playerDir.length() < 0.1) {
            playerDir.set(0, 0, -1); // Default: kick toward opponent's goal
          }
          
          // Calculate kick force based on direction and position
          // The kick should be stronger and more precise
          const kickForce = KICK_POWER * 8; // Significantly increased kick power
          
          // Create kick vector:
          // - Direction: primarily in player's facing direction
          // - Vertical component: add upward force for better arc
          // - Strength: apply significant force for visible movement
          const kickVector: [number, number, number] = [
            playerDir.x * kickForce * 0.8, // X component
            3,                             // Y component (upward force)
            playerDir.z * kickForce        // Z component (forward force)
          ];
          
          // Reset ball angular velocity before applying new force
          ballBody.angularVelocity.set(0, 0, 0);
          
          // Apply the kick force
          ballBody.velocity.set(0, 0, 0); // Reset velocity first for more consistent kicks
          applyForce(ballBody, kickVector);
          
          // Add random spin to make kick more dynamic
          const spinForce = 2 + Math.random() * 3;
          const spinX = (Math.random() - 0.5) * spinForce;
          const spinY = (Math.random() - 0.5) * spinForce;
          const spinZ = (Math.random() - 0.5) * spinForce;
          
          ballBody.angularVelocity.set(spinX, spinY, spinZ);
          
          console.log("⚽ Ball kicked with force:", kickVector);
          
          // Play kick sound
          playHit();
          
          // Set cooldown - shorter for more responsive gameplay
          kickCooldownRef.current = 0.3;
        } else {
          console.log("Ball too far to kick, distance:", distance);
        }
      }
    }
    
    // Use special ability with E key
    if (keys.ability && !isAbilityActive && cooldownRemaining <= 0) {
      console.log("Activating ability for:", character);
      activateAbility(character);
    }
    
    // Prevent character from drifting or falling too far
    if (playerBody.position.z > 10 || playerBody.position.z < -10) {
      playerBody.position.z = Math.sign(playerBody.position.z) * 10;
      playerBody.velocity.z = 0;
    }
    
    // Reset position if player falls off the field
    if (playerBody.position.y < -5) {
      playerBody.position.set(0, 1, 8);
      playerBody.velocity.set(0, 0, 0);
    }
  });
  
  // Return visual effects for active abilities
  if (activeAbility) {
    return (
      <group>
        {/* Visual effect for active ability */}
        {activeAbility === 'bitcoin' && (
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color="#f7931a" transparent opacity={0.2} />
          </mesh>
        )}
        
        {activeAbility === 'ethereum' && (
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color="#627eea" transparent opacity={0.2} />
          </mesh>
        )}
        
        {activeAbility === 'dogecoin' && (
          <>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color="#c3a634" transparent opacity={0.3} />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={2} distance={3} color="#c3a634" />
          </>
        )}
      </group>
    );
  }
  
  return null;
};

export default PlayerController;
