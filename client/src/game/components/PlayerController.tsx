import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@/lib/hooks/useKeyboardControls";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useCharacter } from "@/lib/stores/useCharacter";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState } from "@/lib/stores/useGameState";
import { Vector3 } from "three";
import { MOVE_SPEED, JUMP_FORCE, KICK_POWER } from "../constants";

// Player controller handles input and character movement
const PlayerController = ({ character }: { character: string }) => {
  const [subscribeKeys, getKeys] = useKeyboardControls();
  const { getBody, applyForce } = usePhysics();
  const { activateAbility, isAbilityActive, cooldownRemaining } = useCharacter();
  const { playHit } = useAudio();
  const { gameState } = useGameState();
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const direction = useRef(new Vector3());
  const isOnGroundRef = useRef(true);
  const frameCount = useRef(0);
  
  // Log when component mounts
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
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [character]);
  
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
    const moveSpeed = MOVE_SPEED * 15; // Scale up for better responsiveness
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
      const jumpForce = JUMP_FORCE * 20 * playerBody.mass; // Scale for better jump
      applyForce(playerBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.3; // Shorter cooldown for responsive jumps
      console.log("Jump applied", jumpForce);
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
        
        // Only kick if ball is within range
        if (distance < 3) { // Increased range for better game feel
          // Kick direction (always toward opponent's goal)
          const kickForce = KICK_POWER * 3;
          // Make sure we have exactly 3 components for the vector
          const kickVector: [number, number, number] = [dx * 0.2, 2, -kickForce * 0.8]; 
          
          applyForce(ballBody, kickVector);
          console.log("Ball kicked with force:", kickVector);
          
          // Play kick sound
          playHit();
          
          // Set cooldown
          kickCooldownRef.current = 0.5; // 0.5 second cooldown
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
  
  return null;
};

export default PlayerController;
