import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";
import { Vector3 } from "three";

// Simple AI opponent controller
const AIController = () => {
  const { getBody, applyForce } = usePhysics();
  const { gameState } = useGameState();
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const targetPosition = useRef(new Vector3());
  const difficulty = 0.7; // AI difficulty level (0-1)
  
  // Process AI movement on each frame
  useFrame((state, delta) => {
    // Don't process if game is over
    if (gameState !== 'playing') return;
    
    const aiBody = getBody('ai_character');
    const ballBody = getBody('ball');
    
    if (!aiBody || !ballBody) return;
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    
    // AI Logic:
    // 1. Chase the ball when it's on AI's side
    // 2. Return to defensive position otherwise
    
    const aiPos = aiBody.position;
    const ballPos = ballBody.position;
    
    // Determine if ball is on AI's side
    const isBallOnAISide = ballPos.z < 0;
    
    // Set target position
    if (isBallOnAISide) {
      // Chase the ball
      targetPosition.current.set(ballPos.x, aiPos.y, ballPos.z - 1);
    } else {
      // Return to defensive position
      targetPosition.current.set(0, aiPos.y, -8);
    }
    
    // Calculate movement direction
    const moveDirection = new Vector3();
    moveDirection.x = targetPosition.current.x - aiPos.x;
    
    // Normalize movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }
    
    // Apply movement force with some randomness based on difficulty
    const shouldMove = Math.random() < difficulty;
    if (shouldMove) {
      const moveSpeed = 45; // Slightly slower than player
      const force = moveDirection.multiplyScalar(moveSpeed * aiBody.mass);
      applyForce(aiBody, [force.x, 0, 0]);
    }
    
    // Jump occasionally if ball is above AI
    const shouldJump = ballPos.y > aiPos.y + 1 && 
                       Math.abs(ballPos.x - aiPos.x) < 2 && 
                       Math.abs(ballPos.z - aiPos.z) < 2 && 
                       jumpCooldownRef.current <= 0 &&
                       Math.random() < 0.1 * difficulty;
    
    if (shouldJump) {
      const jumpForce = 120 * aiBody.mass;
      applyForce(aiBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 1;
    }
    
    // Kick the ball when close to it
    const dx = ballPos.x - aiPos.x;
    const dy = ballPos.y - aiPos.y;
    const dz = ballPos.z - aiPos.z;
    const distanceToBall = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    const shouldKick = distanceToBall < 2 && 
                       kickCooldownRef.current <= 0 && 
                       Math.random() < 0.8 * difficulty;
    
    if (shouldKick) {
      // Always kick toward player's goal
      const kickForce = 20;
      applyForce(ballBody, [dx * 0.5, 1, kickForce]);
      kickCooldownRef.current = 0.7; // Slightly longer cooldown than player
    }
  });
  
  return null;
};

export default AIController;
