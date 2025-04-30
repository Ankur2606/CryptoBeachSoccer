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
    // Don't process input if game is over
    if (gameState !== 'playing') return;
    
    const playerBody = getBody('player_character');
    if (!playerBody) {
      console.log("Player body not found");
      return;
    }
    
    // Get current key states
    const keys = getKeys();
    
    // Log key states occasionally for debugging
    if (Math.random() < 0.01) {
      console.log("Current keys:", keys);
    }
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    
    // Movement
    const moveSpeed = MOVE_SPEED * 10; // Scale up for better responsiveness
    direction.current.set(0, 0, 0);
    
    // WASD and Arrow Keys for movement
    if (keys.left) direction.current.x = -1;
    if (keys.right) direction.current.x = 1;
    
    // Check if character is on ground for jumping
    isOnGroundRef.current = playerBody.position.y < 0.6;
    
    // Apply movement force with dampening for better control
    if (direction.current.length() > 0) {
      // Scale force by mass for consistent movement
      const force = new Vector3()
        .copy(direction.current)
        .normalize()
        .multiplyScalar(moveSpeed * playerBody.mass * delta * 60);
      
      applyForce(playerBody, [force.x, 0, 0]);
      
      // Apply some drag to prevent excessive speed
      const velocity = playerBody.velocity;
      const maxSpeed = 8;
      
      if (Math.abs(velocity.x) > maxSpeed) {
        playerBody.velocity.x = Math.sign(velocity.x) * maxSpeed;
      }
    } else {
      // Apply damping when not pressing movement keys
      playerBody.velocity.x *= 0.9;
    }
    
    // Jump (only when on ground)
    if (keys.jump && isOnGroundRef.current && jumpCooldownRef.current <= 0) {
      const jumpForce = JUMP_FORCE * 20 * playerBody.mass; // Scale for better jump
      applyForce(playerBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.3; // Shorter cooldown for responsive jumps
      console.log("Jump applied", jumpForce);
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
