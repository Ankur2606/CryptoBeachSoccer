import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@/lib/hooks/useKeyboardControls";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useCharacter } from "@/lib/stores/useCharacter";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState } from "@/lib/stores/useGameState";
import { Vector3 } from "three";
import { characterData } from "../models/character";

// Player controller handles input and character movement
const PlayerController = ({ character }: { character: string }) => {
  const [subscribeKeys, getKeys] = useKeyboardControls();
  const { getBody, applyForce } = usePhysics();
  const { activateAbility, isAbilityActive, startCooldown, cooldownRemaining } = useCharacter();
  const { playHit } = useAudio();
  const { gameState } = useGameState();
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const direction = useRef(new Vector3());
  
  // Set up controls
  useEffect(() => {
    // No need to clean up, automatically handled by useKeyboardControls
    return () => {};
  }, []);
  
  // Process input and move character each frame
  useFrame((state, delta) => {
    // Don't process input if game is over
    if (gameState !== 'playing') return;
    
    const playerBody = getBody('player_character');
    if (!playerBody) return;
    
    // Get current key states
    const { left, right, jump, kick, ability } = getKeys();
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    
    // Movement
    const moveSpeed = 50;
    direction.current.set(0, 0, 0);
    
    if (left) direction.current.x = -1;
    if (right) direction.current.x = 1;
    
    // Apply movement force
    if (direction.current.length() > 0) {
      const characterData = getBody('player_character');
      if (characterData) {
        // Scale force by mass for consistent movement
        const force = direction.current.multiplyScalar(moveSpeed * playerBody.mass);
        applyForce(playerBody, [force.x, 0, 0]);
      }
    }
    
    // Jump
    if (jump && jumpCooldownRef.current <= 0) {
      const jumpForce = 120 * playerBody.mass; // Scale by mass for consistent jump height
      applyForce(playerBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 1; // 1 second cooldown
    }
    
    // Kick the ball
    if (kick && kickCooldownRef.current <= 0) {
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
        if (distance < 2) {
          // Kick direction (always toward opponent's goal)
          const kickForce = 25;
          applyForce(ballBody, [dx * 0.5, 1, -kickForce]);
          
          // Play kick sound
          playHit();
          
          // Set cooldown
          kickCooldownRef.current = 0.5; // 0.5 second cooldown
        }
      }
    }
    
    // Use special ability
    if (ability && !isAbilityActive && cooldownRemaining <= 0) {
      activateAbility(character);
    }
  });
  
  return null;
};

export default PlayerController;
