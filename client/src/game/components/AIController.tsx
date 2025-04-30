import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useGameState } from "@/lib/stores/useGameState";
import { useAudio } from "@/lib/stores/useAudio";
import { Vector3 } from "three";

// AI states for more dynamic behavior
type AIState = 'defend' | 'chase' | 'attack' | 'return' | 'intercept' | 'position' | 'recover';

// Skill levels for different aspects of AI behavior
interface AISkills {
  movement: number;  // How precisely AI moves
  reaction: number;  // How quickly AI reacts to ball changes
  prediction: number; // How well AI predicts ball trajectory
  positioning: number; // How well AI positions itself
  aggression: number; // How aggressively AI attacks
  kicking: number;   // How accurate AI kicks are
}

// Enhanced AI opponent controller
const AIController = () => {
  const { getBody, applyForce } = usePhysics();
  const { gameState } = useGameState();
  const { playHit } = useAudio();
  
  // AI state management with more nuanced states
  const [aiState, setAIState] = useState<AIState>('defend');
  const stateChangeTimer = useRef(0);
  const previousBallPosition = useRef(new Vector3());
  const ballVelocity = useRef(new Vector3());
  const ballTrajectoryTime = useRef(0);
  const lastStateChangeTime = useRef(0);
  const decisionMakingDelay = useRef(0.05); // Human-like reaction delay (seconds)
  
  // Decision making history for more human-like patterns
  const decisionHistory = useRef<string[]>([]);
  const mistakeTimer = useRef(0);
  const recoveryPosition = useRef(new Vector3());
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const targetPosition = useRef(new Vector3());
  const predictedBallPosition = useRef(new Vector3());
  const frameCount = useRef(0);
  
  // Advanced difficulty settings (0-1 scale)
  const difficulty = 0.9; 
  
  // AI skills configuration - adjusted for more human-like behavior
  const [aiSkills] = useState<AISkills>({
    movement: 0.75 + (difficulty * 0.25),     // Base movement skill + difficulty bonus
    reaction: 0.5 + (difficulty * 0.4),       // Lower base reaction time to feel more human
    prediction: 0.6 + (difficulty * 0.35),    // Prediction accuracy
    positioning: 0.7 + (difficulty * 0.3),    // Positioning intelligence
    aggression: 0.45 + (difficulty * 0.4),    // Aggression level (lower base for more human-like)
    kicking: 0.6 + (difficulty * 0.3)         // Kicking accuracy
  });
  
  // Initialize ball history for trajectory prediction
  const ballPositionHistory = useRef<Vector3[]>([]);
  const MAX_HISTORY = 10;
  
  // Setup behavioral patterns
  useEffect(() => {
    // Simulate AI "learning" the game over time
    const adaptiveTimer = setInterval(() => {
      // Slightly improve a random skill as the game progresses
      const skills = Object.keys(aiSkills) as (keyof AISkills)[];
      const skillToImprove = skills[Math.floor(Math.random() * skills.length)];
      
      // @ts-ignore: Object is possibly 'null'
      aiSkills[skillToImprove] = Math.min(1, aiSkills[skillToImprove] + 0.02);
      
      // Introduce occasional mistakes to appear more human-like
      mistakeTimer.current = 2 + Math.random() * 3;
    }, 20000); // Every 20 seconds
    
    return () => clearInterval(adaptiveTimer);
  }, []);
  
  // Process AI movement on each frame
  useFrame((state, delta) => {
    // Update frame counter for periodic actions
    frameCount.current++;
    
    // Don't process if game is over
    if (gameState !== 'playing') return;
    
    const aiBody = getBody('ai_character');
    const ballBody = getBody('ball');
    const playerBody = getBody('player_character');
    
    if (!aiBody || !ballBody) return;
    
    // Track ball position history for prediction
    if (frameCount.current % 3 === 0) { // Sample ball position every few frames
      ballPositionHistory.current.push(new Vector3().copy(ballBody.position));
      if (ballPositionHistory.current.length > MAX_HISTORY) {
        ballPositionHistory.current.shift();
      }
    }
    
    // Calculate ball velocity based on position history
    if (ballPositionHistory.current.length >= 2) {
      const newest = ballPositionHistory.current[ballPositionHistory.current.length - 1];
      const oldest = ballPositionHistory.current[0];
      const timeSpan = (ballPositionHistory.current.length - 1) * 3 * delta;
      
      if (timeSpan > 0) {
        ballVelocity.current.copy(newest).sub(oldest).divideScalar(timeSpan);
      }
    }
    
    // Prevent ball from getting stuck in goal corners - detect and take action
    const ballPos = ballBody.position;
    // Check if ball is in a goal corner or inaccessible area
    const isInGoalCorner = (Math.abs(ballPos.x) > 3) && (Math.abs(ballPos.z) > 13);
    const isInInaccessibleArea = (Math.abs(ballPos.x) > 4) && (Math.abs(ballPos.z) > 12);
    
    if (isInGoalCorner || isInInaccessibleArea) {
      // If AI is close to ball in these areas, immediately kick it out
      const aiPos = aiBody.position;
      const distToBall = Math.sqrt(
        Math.pow(aiPos.x - ballPos.x, 2) + 
        Math.pow(aiPos.z - ballPos.z, 2)
      );
      
      if (distToBall < 2.5) {
        // Force the AI to kick the ball back into play
        const kickTowardsCenter = new Vector3(
          -ballPos.x * 0.5,  // Towards center X
          2 + Math.random(),  // Up into the air
          -ballPos.z * 0.3   // Towards center Z
        );
        kickTowardsCenter.normalize().multiplyScalar(40 + Math.random() * 20);
        
        // Apply immediate kick to get the ball out of the corner
        applyForce(ballBody, [kickTowardsCenter.x, kickTowardsCenter.y, kickTowardsCenter.z]);
        playHit();
        
        console.log("AI kicked ball out of inaccessible area");
        
        // Set cooldown so AI doesn't immediately kick again
        kickCooldownRef.current = 0.8;
      }
    }
    
    // Predict where the ball will be in the near future - more human-like with some inaccuracy
    const predictionAccuracy = aiSkills.prediction * (1 - (mistakeTimer.current > 0 ? 0.4 : 0));
    const predictionTimeAhead = 0.8 * predictionAccuracy;
    
    predictedBallPosition.current.copy(ballBody.position)
      .add(ballVelocity.current.clone().multiplyScalar(predictionTimeAhead));
    
    // Add some human-like error to the prediction
    const predictionError = (1 - predictionAccuracy) * 2;
    predictedBallPosition.current.x += (Math.random() * 2 - 1) * predictionError;
    predictedBallPosition.current.z += (Math.random() * 2 - 1) * predictionError;
    
    // Decrease cooldowns
    if (kickCooldownRef.current > 0) kickCooldownRef.current -= delta;
    if (jumpCooldownRef.current > 0) jumpCooldownRef.current -= delta;
    if (mistakeTimer.current > 0) mistakeTimer.current -= delta;
    
    // Human-like decision making with variable timing
    decisionMakingDelay.current -= delta;
    if (decisionMakingDelay.current <= 0) {
      // Update AI state with human-like delay
      updateAIState(aiBody.position, ballBody.position, playerBody?.position);
      
      // Variable delay between 0.05s and 0.3s based on reaction skill
      // Higher skill = faster reactions, but still human-like
      decisionMakingDelay.current = 0.05 + (0.25 * (1 - aiSkills.reaction)) + (Math.random() * 0.1);
      
      // Record this decision for human-like patterns
      if (aiState) {
        decisionHistory.current.push(aiState);
        if (decisionHistory.current.length > 10) decisionHistory.current.shift();
      }
    }
    
    // Update state change timer
    stateChangeTimer.current -= delta;
    if (stateChangeTimer.current <= 0) {
      const now = Date.now();
      const timeSinceLastChange = (now - lastStateChangeTime.current) / 1000;
      
      // Don't change state too frequently (human players don't)
      if (timeSinceLastChange > 0.8) {
        updateAIState(aiBody.position, ballBody.position, playerBody?.position);
        lastStateChangeTime.current = now;
        
        // Add variability to state change timing based on current game situation
        const baseStateTime = aiState === 'attack' ? 1.3 : 
                             aiState === 'chase' ? 0.9 : 1.1;
                             
        stateChangeTimer.current = baseStateTime + (Math.random() * 0.5);
      }
    }
    
    const aiPos = aiBody.position;
    
    // Determine target position based on current AI state and predicted ball position
    updateTargetPosition(aiPos, ballPos, playerBody?.position);
    
    // Calculate movement direction vector (now in 3D with human-like imperfection)
    const moveDirection = new Vector3(
      targetPosition.current.x - aiPos.x,
      0,
      targetPosition.current.z - aiPos.z
    );
    
    // Add human-like imprecision to movement
    const movementError = Math.max(0, 0.3 - (0.25 * aiSkills.movement));
    if (Math.random() < 0.3) { // Occasionally adjust aim slightly
      moveDirection.x += (Math.random() * 2 - 1) * movementError;
      moveDirection.z += (Math.random() * 2 - 1) * movementError;
    }
    
    // Normalize movement vector if it has length
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }
    
    // Simulate human input - sometimes not pressing buttons, sometimes pressing wrong ones
    // Lower skill means more "mistakes" in movement
    const willMakeMovementMistake = Math.random() > aiSkills.movement;
    const shouldMove = !willMakeMovementMistake && 
                     (moveDirection.length() > 0.2 || aiState === 'chase' || aiState === 'attack');
    
    // Apply movement with human-like responsiveness and occasional hesitation
    if (shouldMove) {
      // Different move speeds based on state - like a human would vary their input
      const moveSpeedMultiplier = 
        aiState === 'attack' ? 3.0 + (Math.random() * 0.4) : 
        aiState === 'chase' ? 2.7 + (Math.random() * 0.6) : 
        aiState === 'intercept' ? 3.2 : 
        2.4 + (Math.random() * 0.3);
      
      // Direct velocity control with some human-like inconsistency
      const targetVelocityX = moveDirection.x * moveSpeedMultiplier * 5;
      const targetVelocityZ = moveDirection.z * moveSpeedMultiplier * 5;
      
      // Variable lerp factor for more human-like acceleration/deceleration patterns
      const lerpFactor = aiState === 'intercept' || aiState === 'chase' ? 0.6 : 0.4;
      
      // Apply velocity changes with human-like smoothing
      aiBody.velocity.x = aiBody.velocity.x * (1 - lerpFactor) + targetVelocityX * lerpFactor;
      aiBody.velocity.z = aiBody.velocity.z * (1 - lerpFactor) + targetVelocityZ * lerpFactor;
      
      // Add force for better physics interaction with variable strength
      const moveForceMultiplier = 
        aiState === 'intercept' ? 120 :
        aiState === 'attack' ? 100 + (Math.random() * 30) : 
        80 + (Math.random() * 40);
         
      const force = moveDirection.clone().multiplyScalar(moveForceMultiplier * aiBody.mass);
      applyForce(aiBody, [force.x, 0, force.z]);
      
      // Log AI movement and state occasionally
      if (frameCount.current % 300 === 0) {
        console.log(`AI State: ${aiState}, moving to:`, targetPosition.current);
      }
    } else if (willMakeMovementMistake && mistakeTimer.current > 0) {
      // Simulate confusion or mistake - move in wrong direction briefly
      const wrongDirection = new Vector3(
        (Math.random() * 2 - 1),
        0,
        (Math.random() * 2 - 1)
      ).normalize();
      
      const wrongForce = wrongDirection.multiplyScalar(30 * aiBody.mass);
      applyForce(aiBody, [wrongForce.x, 0, wrongForce.z]);
    }
    
    // More human-like jumping with predictive capability and occasional mistakes
    const ballIsHigh = ballPos.y > aiPos.y + 0.7;
    const ballIsApproaching = Math.abs(ballPos.x - aiPos.x) < 4 && 
                             Math.abs(ballPos.z - aiPos.z) < 4;
    const predictedBallHeight = predictedBallPosition.current.y > aiPos.y + 1.0;
    
    // Smart interception jumping - predict when to jump like a human would
    const shouldJump = (ballIsHigh || predictedBallHeight) && 
                      ballIsApproaching && 
                      jumpCooldownRef.current <= 0 &&
                      (aiState === 'intercept' || aiState === 'chase') &&
                      (Math.random() < aiSkills.reaction * (ballIsHigh ? 0.7 : 0.4));
    
    if (shouldJump) {
      // Variable jump force based on ball height and position - like a human would gauge
      const neededJumpHeight = Math.min(2, Math.max(1.2, ballPos.y - aiPos.y + 0.5));
      const jumpForce = (150 + (neededJumpHeight * 60)) * aiBody.mass;
      
      applyForce(aiBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.9; // Slightly longer cooldown for more human rhythm
      
      if (frameCount.current % 50 === 0) {
        console.log(`AI jumping to intercept ball at height ${ballPos.y.toFixed(1)}`);
      }
    }
    
    // Calculate distance to ball
    const dx = ballPos.x - aiPos.x;
    const dy = ballPos.y - aiPos.y;
    const dz = ballPos.z - aiPos.z;
    const distanceToBall = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Human-like kicking decision with situational awareness
    const inKickRange = distanceToBall < 2.5;
    const kickOnCooldown = kickCooldownRef.current > 0;
    const ballMovingTowardGoal = ballVelocity.current.z > 0;
    
    // IMPORTANT: Check if AI is in a goal corner to avoid exploiting inaccessible areas
    const aiInGoalCorner = (Math.abs(aiPos.x) > 3) && (Math.abs(aiPos.z) > 13);
    const aiInInaccessibleArea = (Math.abs(aiPos.x) > 4) && (Math.abs(aiPos.z) > 12);
    
    // Force kick if in corners to avoid getting stuck
    const shouldKick = (inKickRange && 
                      !kickOnCooldown &&
                      (aiState === 'attack' || aiState === 'chase') &&
                      (Math.random() < aiSkills.aggression * 0.9)) || 
                      (inKickRange && (aiInGoalCorner || aiInInaccessibleArea));
    
    if (shouldKick) {
      // Smarter kicking with human-like aiming errors
      let kickX = dx * 0.2;
      let kickY = 1.8 + (Math.random() * 1);
      let kickZ;
      
      // If in inaccessible area or corner, always kick toward center field
      if (aiInGoalCorner || aiInInaccessibleArea) {
        // Kick strongly toward center of field
        kickX = -aiPos.x * (1.5 + Math.random());
        kickY = 2 + Math.random();
        kickZ = -aiPos.z * (1 + Math.random() * 0.5);
        
        // Normalize and apply strong force to get out of corner
        const kickDir = new Vector3(kickX, 0, kickZ).normalize();
        kickX = kickDir.x * 50;
        kickZ = kickDir.z * 50;
        
        console.log("AI forcing ball back into play from inaccessible area");
      }
      else if (aiState === 'attack' && aiPos.z < 8) {
        // Calculate vector to player's goal with some inaccuracy
        const goalX = 0 - aiPos.x; 
        const goalZ = 15 - aiPos.z; // Player goal is at z=15
        
        // Apply human-like aiming error based on skill level
        const aimErrorX = (1 - aiSkills.kicking) * 5 * (Math.random() * 2 - 1);
        const aimErrorZ = (1 - aiSkills.kicking) * 3 * (Math.random() * 2 - 1);
        
        const goalDir = new Vector3(goalX + aimErrorX, 0, goalZ + aimErrorZ).normalize();
        
        // Power varies based on distance to goal
        const distToGoal = Math.sqrt(goalX*goalX + goalZ*goalZ);
        const kickPowerZ = Math.min(80, Math.max(35, distToGoal * 2.5));
        
        kickX = goalDir.x * (5 + (Math.random() * 5));
        kickZ = goalDir.z * kickPowerZ;
      } else {
        // Regular kick with variable power
        kickZ = (ballMovingTowardGoal ? 1 : -1) * (20 + (Math.random() * 20));
        
        // Sometimes deliberately kick to the sides, but not toward inaccessible areas
        if (Math.random() < 0.3) {
          // Ensure we're not kicking toward the goal corners
          const potentialKickX = kickX * 3 * (Math.random() > 0.5 ? 1 : -1);
          // Only allow side kicks if they won't send the ball toward corners
          if (Math.abs(potentialKickX) < 3 || Math.abs(ballPos.z) < 10) {
            kickX = potentialKickX;
          }
        }
      }
      
      // Add some randomness to vertical component based on situation
      if (Math.random() < 0.4 && aiPos.z < 0) {
        kickY *= 1.5; // Occasionally lob the ball
      }
      
      // Apply the kick with human-like variability
      applyForce(ballBody, [kickX, kickY, kickZ]);
      playHit(); // Play sound for AI kick
      
      // Variable cooldown based on the kick type - humans don't kick at exact intervals
      kickCooldownRef.current = 0.4 + (Math.random() * 0.3);
      
      if (frameCount.current % 20 === 0 || aiInGoalCorner) {
        console.log("AI kicked ball with force:", [kickX.toFixed(1), kickY.toFixed(1), kickZ.toFixed(1)]);
      }
    }
    
    // Store previous ball position for velocity calculation
    previousBallPosition.current.copy(ballBody.position);
  });
  
  // Update AI state based on game situation with more advanced decision making
  function updateAIState(aiPos: any, ballPos: any, playerPos?: any) {
    const ballOnAISide = ballPos.z < 0;
    const ballCloseToAI = Math.abs(ballPos.x - aiPos.x) < 5 && Math.abs(ballPos.z - aiPos.z) < 5;
    const ballMovingToAI = ballVelocity.current.z < -1;
    const ballMovingToGoal = ballVelocity.current.z > 1;
    const ballInAir = ballPos.y > 1;
    const aiCloseToGoal = aiPos.z < -10;
    
    // Check if ball or AI is in inaccessible corner area
    const ballInCorner = (Math.abs(ballPos.x) > 3) && (Math.abs(ballPos.z) > 13);
    const aiInCorner = (Math.abs(aiPos.x) > 3) && (Math.abs(aiPos.z) > 13);
    
    // If ball is in corner, prioritize getting it out
    if (ballInCorner && ballCloseToAI) {
      setAIState('chase');
      return;
    }
    
    // If AI is in corner, prioritize getting out
    if (aiInCorner) {
      setAIState('return');
      return;
    }
    
    // Calculate risk factor based on ball position and velocity
    const dangerToGoal = ballOnAISide && ballMovingToGoal && ballPos.z < -5;
    const scoringOpportunity = !ballOnAISide && ballPos.z > 5;
    
    // Track if the player is between AI and ball
    let playerBlockingPath = false;
    if (playerPos) {
      const aiToBallVector = new Vector3(ballPos.x - aiPos.x, 0, ballPos.z - aiPos.z).normalize();
      const aiToPlayerVector = new Vector3(playerPos.x - aiPos.x, 0, playerPos.z - aiPos.z).normalize();
      const dotProduct = aiToBallVector.dot(aiToPlayerVector);
      playerBlockingPath = dotProduct > 0.7 && 
                          Math.abs(playerPos.x - aiPos.x) < 3 && 
                          Math.abs(playerPos.z - aiPos.z) < 3;
    }
    
    // More complex state transitions that simulate human decision making
    
    // Emergency defense - highest priority
    if (dangerToGoal || (ballOnAISide && aiPos.z > -8 && ballPos.z < -10)) {
      setAIState('defend');
      return;
    }
    
    // Ball interception opportunity
    if (ballInAir && ballMovingToAI && ballCloseToAI) {
      setAIState('intercept');
      return;
    }
    
    // Opportunity to score
    if (scoringOpportunity && ballCloseToAI) {
      // Aggressive push to score
      setAIState(Math.random() < aiSkills.aggression ? 'attack' : 'chase');
      return;
    }
    
    // If player is blocking direct path to ball, try to position around them
    if (playerBlockingPath && ballCloseToAI) {
      setAIState('position');
      // Set recovery position to move around player
      recoveryPosition.current.set(
        aiPos.x + (Math.random() > 0.5 ? 3 : -3),
        aiPos.y,
        aiPos.z + (ballOnAISide ? 1 : -1)
      );
      return;
    }
    
    // Default state transitions with probabilities based on situation
    if (ballOnAISide) {
      if (ballCloseToAI) {
        setAIState(Math.random() < 0.8 ? 'chase' : 'position');
      } else if (aiCloseToGoal) {
        setAIState('position'); // Move to better position when close to own goal
      } else {
        // Mix of positioning and defending based on ball distance
        setAIState(Math.random() < 0.6 ? 'defend' : 'position');
      }
    } else {
      // Ball on player's side
      if (Math.random() < aiSkills.aggression && !aiCloseToGoal) {
        setAIState('attack'); // Sometimes push forward aggressively
      } else if (aiPos.z < -5) {
        // Not too far forward, position for counterattack
        setAIState('position');
      } else {
        // Return to defensive position
        setAIState('return');
      }
    }
  }
  
  // Update target position based on current AI state with more human-like positioning
  function updateTargetPosition(aiPos: any, ballPos: any, playerPos?: any) {
    // Apply some position error based on AI skill
    const positionError = (1 - aiSkills.positioning) * 2;
    const errorX = (Math.random() * 2 - 1) * positionError;
    const errorZ = (Math.random() * 2 - 1) * positionError;
    
    // Check if AI is currently in a corner or inaccessible area
    const aiInCorner = (Math.abs(aiPos.x) > 3) && (Math.abs(aiPos.z) > 13);
    const aiInInaccessibleArea = (Math.abs(aiPos.x) > 4) && (Math.abs(aiPos.z) > 12);
    
    // If in corner or inaccessible area, prioritize moving back to accessible area
    if (aiInCorner || aiInInaccessibleArea) {
      // Head towards center of field
      targetPosition.current.set(
        -aiPos.x * 0.5, // Move away from corner
        aiPos.y,
        -aiPos.z * 0.5  // Move away from corner
      );
      
      // Make sure target is in accessible area
      if (Math.abs(targetPosition.current.x) > 3) {
        targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
      }
      if (Math.abs(targetPosition.current.z) > 12) {
        targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
      }
      
      return;
    }
    
    switch (aiState) {
      case 'defend':
        // Smarter defending - position between ball and goal
        const goalX = 0;
        const goalZ = -14; // AI goal position
        const ballToGoalX = goalX - ballPos.x;
        const ballToGoalZ = goalZ - ballPos.z;
        const ballToGoalDist = Math.sqrt(ballToGoalX*ballToGoalX + ballToGoalZ*ballToGoalZ);
        
        // Position 30-70% of the way between ball and goal based on threat level
        const threatLevel = Math.min(1, Math.max(0, (14 + ballPos.z) / 14));
        const positionFactor = 0.3 + (0.4 * threatLevel);
        
        targetPosition.current.set(
          ballPos.x - (ballToGoalX * positionFactor) + errorX,
          aiPos.y,
          ballPos.z - (ballToGoalZ * positionFactor) + errorZ
        );
        
        // If very close to goal, prioritize central position
        if (aiPos.z < -12) {
          targetPosition.current.x = ballPos.x * 0.7 + errorX;
          targetPosition.current.z = Math.max(-13, ballPos.z - 1) + errorZ;
        }
        
        // Avoid targeting corners or inaccessible areas
        if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
          // Adjust to stay in accessible area
          targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
          targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
        }
        break;
      
      case 'chase':
        // Direct ball chase with slight leading based on ball velocity
        targetPosition.current.set(
          ballPos.x + (ballVelocity.current.x * 0.2) + errorX,
          aiPos.y,
          ballPos.z + (ballVelocity.current.z * 0.2) - 0.5 + errorZ
        );
        
        // Avoid chasing into inaccessible areas
        if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
          // If ball is in corner, adjust target to stay in accessible area
          if (Math.abs(ballPos.x) > 3 && Math.abs(ballPos.z) > 13) {
            targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
            targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
          }
        }
        break;
      
      case 'intercept':
        // Intercept the ball's predicted position
        targetPosition.current.set(
          predictedBallPosition.current.x + errorX,
          aiPos.y,
          predictedBallPosition.current.z + errorZ
        );
        
        // Avoid corners and inaccessible areas
        if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
          targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
          targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
        }
        break;
      
      case 'attack':
        // Smarter attacking - move with ball toward opponent's goal
        // Try to get on the side of the ball closer to the opponent's goal
        const attackOffset = ballPos.z > 0 ? 0.5 : -0.5;
        targetPosition.current.set(
          ballPos.x + errorX,
          aiPos.y,
          ballPos.z + attackOffset + errorZ
        );
        
        // If player is defending, try to move around them
        if (playerPos && Math.abs(playerPos.x - ballPos.x) < 2 && 
            Math.abs(playerPos.z - ballPos.z) < 2) {
          // Ensure the AI doesn't move toward corners when avoiding player
          const sideDirection = Math.random() > 0.5 ? 2 : -2;
          targetPosition.current.x = ballPos.x + sideDirection;
          
          // If this would lead to a corner, reverse direction
          if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
            targetPosition.current.x = ballPos.x - sideDirection;
          }
        }
        
        // Avoid corners when attacking
        if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
          targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
          targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
        }
        break;
      
      case 'return':
        // Return to defensive position with some variability, avoiding corners
        targetPosition.current.set(
          Math.min(3, Math.max(-3, errorX * 2)), // Ensure x is within safe range
          aiPos.y,
          -8 + (Math.random() * 2) + errorZ
        );
        break;
      
      case 'position':
        // Intelligent positioning based on game state, avoiding corners
        if (ballPos.z < 0) {
          // Ball on AI side - position to intercept or clear
          const potentialX = ballPos.x + (Math.random() > 0.5 ? 2 : -2) + errorX;
          targetPosition.current.set(
            Math.min(3, Math.max(-3, potentialX)), // Keep X within safe range
            aiPos.y,
            ballPos.z + (Math.random() > 0.7 ? 2 : 0) + errorZ
          );
        } else {
          // Ball on player side - position for potential counter
          targetPosition.current.set(
            Math.min(3, Math.max(-3, ballPos.x * 0.5 + errorX)), // Keep X within safe range
            aiPos.y,
            -5 + errorZ
          );
        }
        break;
      
      case 'recover':
        // Move to recovery position after being blocked or making a mistake
        targetPosition.current.copy(recoveryPosition.current);
        
        // Ensure recovery position is not in a corner
        if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
          targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
          targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
        }
        break;
    }
    
    // Apply limits to target position to stay in playable area and avoid corners
    targetPosition.current.x = Math.max(-9, Math.min(9, targetPosition.current.x));
    targetPosition.current.z = Math.max(-13, Math.min(13, targetPosition.current.z));
    
    // Additional check to prevent targeting corner areas
    if (Math.abs(targetPosition.current.x) > 3 && Math.abs(targetPosition.current.z) > 12) {
      if (Math.abs(targetPosition.current.x) > Math.abs(targetPosition.current.z)) {
        // Restrict X more severely
        targetPosition.current.x = Math.sign(targetPosition.current.x) * 3;
      } else {
        // Restrict Z more severely
        targetPosition.current.z = Math.sign(targetPosition.current.z) * 12;
      }
    }
  }
  
  return null;
};

export default AIController;
