import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";
import { useAudio } from "@/lib/stores/useAudio";
import { Vector3 } from "three";

// AI states for more dynamic behavior
type AIState = 'defend' | 'chase' | 'attack' | 'return';

// Enhanced AI opponent controller
const AIController = () => {
  const { getBody, applyForce } = usePhysics();
  const { gameState } = useGameState();
  const { playHit } = useAudio();
  
  // AI state management
  const [aiState, setAIState] = useState<AIState>('defend');
  const stateChangeTimer = useRef(0);
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const targetPosition = useRef(new Vector3());
  const difficulty = 0.85; // Increased AI difficulty level (0-1)
  const frameCount = useRef(0);
  
  // Process AI movement on each frame
  useFrame((state, delta) => {
    // Update frame counter for periodic actions
    frameCount.current++;
    
    // Don't process if game is over
    if (gameState !== 'playing') return;
    
    const aiBody = getBody('ai_character');
    const ballBody = getBody('ball');
    
    if (!aiBody || !ballBody) return;
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    
    // Update state change timer
    stateChangeTimer.current -= delta;
    if (stateChangeTimer.current <= 0) {
      updateAIState(aiBody.position, ballBody.position);
      stateChangeTimer.current = 1 + Math.random(); // 1-2 second timer for state changes
    }
    
    const aiPos = aiBody.position;
    const ballPos = ballBody.position;
    
    // Determine target position based on current AI state
    updateTargetPosition(aiPos, ballPos);
    
    // Calculate movement direction vector (now in 3D)
    const moveDirection = new Vector3(
      targetPosition.current.x - aiPos.x,
      0,
      targetPosition.current.z - aiPos.z
    );
    
    // Normalize movement vector if it has length
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }
    
    // Apply movement with increased speed and responsiveness
    const shouldMove = Math.random() < difficulty;
    if (shouldMove) {
      const moveSpeedMultiplier = aiState === 'attack' ? 3.2 : 
                                 aiState === 'chase' ? 2.8 : 2.5;
      
      // Much more responsive direct velocity control
      const targetVelocityX = moveDirection.x * moveSpeedMultiplier * 5;
      const targetVelocityZ = moveDirection.z * moveSpeedMultiplier * 5;
      
      // Faster lerp for more responsive movement (0.5 instead of 0.3)
      aiBody.velocity.x = aiBody.velocity.x * 0.5 + targetVelocityX * 0.5;
      aiBody.velocity.z = aiBody.velocity.z * 0.5 + targetVelocityZ * 0.5;
      
      // Also apply force for good measure - increased from 45 to 100
      const moveSpeed = 100; 
      const force = moveDirection.multiplyScalar(moveSpeed * aiBody.mass);
      applyForce(aiBody, [force.x, 0, force.z]);
      
      // Log AI movement and state occasionally
      if (frameCount.current % 300 === 0) {
        console.log(`AI State: ${aiState}, moving to:`, targetPosition.current);
      }
    }
    
    // More aggressive jumping when the ball is in the air
    const shouldJump = ballPos.y > aiPos.y + 0.8 && 
                       Math.abs(ballPos.x - aiPos.x) < 3 && 
                       Math.abs(ballPos.z - aiPos.z) < 3 && 
                       jumpCooldownRef.current <= 0 &&
                       Math.random() < 0.3 * difficulty; // Increased jump probability
    
    if (shouldJump) {
      // Higher jump force for better ball interception
      const jumpForce = 200 * aiBody.mass;
      applyForce(aiBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.7; // Reduced cooldown for more frequent jumps
      console.log("AI jumping to intercept ball");
    }
    
    // Calculate distance to ball
    const dx = ballPos.x - aiPos.x;
    const dy = ballPos.y - aiPos.y;
    const dz = ballPos.z - aiPos.z;
    const distanceToBall = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // More aggressive kicking
    const shouldKick = distanceToBall < 3 && // Increased kick range 
                       kickCooldownRef.current <= 0 && 
                       Math.random() < 0.9 * difficulty; // Higher kick probability
    
    if (shouldKick) {
      // Smarter kicking - direction based on AI position
      let kickX = dx * 0.2;
      let kickY = 2;
      let kickZ = 30; // Stronger kick
      
      // If in attack mode, aim for the goal with more precision
      if (aiState === 'attack' && aiPos.z < 5) {
        // Calculate vector to player's goal
        const goalX = 0 - aiPos.x;
        const goalZ = 15 - aiPos.z; // Player goal is at z=15
        const goalDir = new Vector3(goalX, 0, goalZ).normalize();
        
        kickX = goalDir.x * 5;
        kickZ = goalDir.z * 40;
      }
      
      applyForce(ballBody, [kickX, kickY, kickZ]);
      playHit(); // Play sound for AI kick
      kickCooldownRef.current = 0.5; // Shorter cooldown for more frequent kicks
      
      if (frameCount.current % 20 === 0) {
        console.log("AI kicked ball with force:", [kickX, kickY, kickZ]);
      }
    }
  });
  
  // Update AI state based on game situation
  function updateAIState(aiPos: any, ballPos: any) {
    const ballOnAISide = ballPos.z < 0;
    const ballCloseToAI = Math.abs(ballPos.x - aiPos.x) < 5 && Math.abs(ballPos.z - aiPos.z) < 5;
    const ballMovingToAI = ballPos.z < -10;
    
    if (ballMovingToAI) {
      setAIState('defend');
    } else if (ballOnAISide && ballCloseToAI) {
      setAIState('chase');
    } else if (!ballOnAISide && ballPos.z > 5) {
      setAIState('return');
    } else if (ballOnAISide && !ballCloseToAI) {
      // Random chance to switch to attack mode when ball is on AI side
      setAIState(Math.random() > 0.7 ? 'attack' : 'defend');
    }
  }
  
  // Update target position based on current AI state
  function updateTargetPosition(aiPos: any, ballPos: any) {
    switch (aiState) {
      case 'defend':
        // Defend goal area
        targetPosition.current.set(ballPos.x * 0.5, aiPos.y, -12);
        break;
      case 'chase':
        // Directly chase the ball
        targetPosition.current.set(ballPos.x, aiPos.y, ballPos.z - 0.5);
        break;
      case 'attack':
        // Move toward player's goal with the ball
        targetPosition.current.set(ballPos.x, aiPos.y, ballPos.z + 2);
        break;
      case 'return':
        // Return to defensive position
        targetPosition.current.set(0, aiPos.y, -8);
        break;
    }
  }
  
  return null;
};

export default AIController;
