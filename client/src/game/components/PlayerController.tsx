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
import websocketService from "@/lib/multiplayer/websocketService";

// Player controller handles input and character movement
const PlayerController = ({ character }: { character: string }) => {
  const [subscribeKeys, getKeys] = useKeyboardControls();
  const { getBody, applyForce } = usePhysics();
  const { activateAbility, isAbilityActive, cooldownRemaining } = useCharacter();
  const { playHit, playSuccess } = useAudio();
  const { gameState, resetGame, isMultiplayer } = useGameState();
  
  // Active crypto ability states
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [abilityTimeRemaining, setAbilityTimeRemaining] = useState(0);
  
  // Speed/jump/kick multipliers for abilities - increased base values for more impact
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [jumpMultiplier, setJumpMultiplier] = useState(1.0);
  const [kickMultiplier, setKickMultiplier] = useState(1.0);
  const [ballControlRadius, setBallControlRadius] = useState(4); // Default ball control radius
  const [isInvincible, setIsInvincible] = useState(false);
  
  const kickCooldownRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const direction = useRef(new Vector3());
  const isOnGroundRef = useRef(true);
  const frameCount = useRef(0);
  const abilityEffectRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store player position and rotation for multiplayer syncing
  const lastPositionUpdateTime = useRef(0);
  const positionUpdateInterval = 50; // milliseconds between position updates
  const opponentPosition = useRef(new Vector3());
  const opponentRotation = useRef(0);

  useEffect(() => {
    if (!isMultiplayer) return;

    // Function to handle position updates from opponent
    const handlePositionUpdate = (message: any) => {
      if (!message.data) return;
      
      // Update opponent position and rotation
      if (message.data.player) {
        opponentPosition.current.set(
          message.data.player.x,
          message.data.player.y,
          message.data.player.z
        );
        opponentRotation.current = message.data.player.rotation;
      }
      
      // Update ball position and physics if we're not the host
      // Host is the authority for ball physics
      if (!websocketService.isRoomHost && message.data.ball) {
        const ballBody = getBody('ball');
        if (ballBody) {
          // Set ball position
          ballBody.position.set(
            message.data.ball.x,
            message.data.ball.y,
            message.data.ball.z
          );
          
          // Set ball velocity if provided
          if (message.data.ball.velocityX !== undefined) {
            ballBody.velocity.set(
              message.data.ball.velocityX,
              message.data.ball.velocityY || 0,
              message.data.ball.velocityZ || 0
            );
          }
          
          // Set angular velocity if provided
          if (message.data.ball.angularVelocityX !== undefined) {
            ballBody.angularVelocity.set(
              message.data.ball.angularVelocityX,
              message.data.ball.angularVelocityY || 0,
              message.data.ball.angularVelocityZ || 0
            );
          }
        }
      }
    };

    // Register position update handler
    websocketService.on('position-update', handlePositionUpdate);
    
    // Function to handle game reset messages from websocket
    const handleGameReset = (message: any) => {
      console.log('🔄 Game reset received from host:', message);
      resetGame();
      playSuccess(); // Play sound for reset feedback
    };
    
    // Listen for game reset events
    websocketService.on('game-reset', handleGameReset);
    
    return () => {
      websocketService.off('position-update', handlePositionUpdate);
      websocketService.off('game-reset', handleGameReset);
    };
  }, [isMultiplayer, resetGame, playSuccess, getBody]);

  // Log when component mounts and set up ability listeners
  useEffect(() => {
    console.log("PlayerController mounted for character:", character);
    
    // Debug keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add R key as game restart
      if (e.code === 'KeyR') {
        console.log("🔄 R key pressed - restarting game");
        
        // In multiplayer mode, only the host can trigger a reset
        if (isMultiplayer) {
          if (websocketService.isHost) {
            console.log("Host restarting game via WebSocket");
            websocketService.resetGame();
          } else {
            console.log("Only the host can restart the multiplayer game");
            // Could show a message to the player here
            return;
          }
        }
        
        // Always reset the game locally (in singleplayer, or if we're the host)
        resetGame();
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Key down:", e.code);
      }
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ability-collected', handleAbilityCollected);
      
      // Clean up any active ability effects on unmount
      if (abilityEffectRef.current) {
        clearTimeout(abilityEffectRef.current);
      }
    };
  }, [character, playSuccess, resetGame, isMultiplayer]);
  
  // Apply the specific crypto ability effect - significantly enhanced
  const applyAbilityEffect = (type: AbilityType, duration: number) => {
    // Clear any existing effects
    if (abilityEffectRef.current) {
      clearTimeout(abilityEffectRef.current);
    }
    
    // Set the active ability
    setActiveAbility(type);
    setAbilityTimeRemaining(duration);
    
    // Reset all multipliers before applying new ones
    setSpeedMultiplier(1.0);
    setJumpMultiplier(1.0);
    setKickMultiplier(1.0);
    setBallControlRadius(4);
    setIsInvincible(false);
    
    // Apply significantly enhanced effects based on ability type
    switch (type) {
      case 'bitcoin':
        // Bitcoin - HODL power: Dramatically improved ball control and kicking power
        console.log("💪 Bitcoin HODL Power activated! Significantly increased kick power and ball control");
        setKickMultiplier(2.5);  // 150% stronger kicks
        setBallControlRadius(7); // Larger ball control radius (was 4)
        // Moderate speed boost too
        setSpeedMultiplier(1.3);
        break;
      
      case 'ethereum':
        // Ethereum - Smart Contract: Superior jumping and movement abilities
        console.log("🦘 Ethereum Smart Contract activated! Extreme jump height and improved speed");
        setJumpMultiplier(2.5);   // 150% higher jumps
        setSpeedMultiplier(1.5);  // 50% faster movement
        // Also improve kick power moderately
        setKickMultiplier(1.3);
        break;
      
      case 'dogecoin':
        // Dogecoin - To The Moon: Massive speed burst and temporary invincibility
        console.log("🚀 Dogecoin TO THE MOON! Extreme speed boost and invincibility");
        setIsInvincible(true);
        setSpeedMultiplier(2.2);   // 120% faster (was 1.7)
        setJumpMultiplier(1.5);    // 50% higher jumps
        setKickMultiplier(1.5);    // 50% stronger kicks
        break;
      
      case 'pepecoin':
        // Pepecoin - Meme Magic: All-around boost to all abilities
        console.log("✨ Pepecoin MEME MAGIC! Enhancing all abilities");
        setSpeedMultiplier(1.8);   // 80% faster
        setJumpMultiplier(1.8);    // 80% higher jumps
        setKickMultiplier(1.8);    // 80% stronger kicks
        setBallControlRadius(6);   // Better ball control
        break;
    }
    
    // Set timeout to end the effect
    abilityEffectRef.current = setTimeout(() => {
      console.log(`Ability ${type} effect ended`);
      setActiveAbility(null);
      setAbilityTimeRemaining(0);
      setSpeedMultiplier(1.0);
      setJumpMultiplier(1.0);
      setKickMultiplier(1.0);
      setBallControlRadius(4);
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
    
    // Track player position and rotation for multiplayer
    if (isMultiplayer) {
      const currentTime = performance.now();
      // Send position updates at regular intervals
      if (currentTime - lastPositionUpdateTime.current > positionUpdateInterval) {
        lastPositionUpdateTime.current = currentTime;
        
        // Get the ball data for synchronization
        const ballBody = getBody('ball');
        const ballData = ballBody ? {
          x: ballBody.position.x,
          y: ballBody.position.y,
          z: ballBody.position.z,
          velocityX: ballBody.velocity.x,
          velocityY: ballBody.velocity.y,
          velocityZ: ballBody.velocity.z,
          angularVelocityX: ballBody.angularVelocity.x,
          angularVelocityY: ballBody.angularVelocity.y,
          angularVelocityZ: ballBody.angularVelocity.z
        } : undefined;
        
        // Calculate player rotation from velocity
        const playerRotation = Math.atan2(
          playerBody.velocity.x, 
          playerBody.velocity.z
        );
        
        // Send position update through websocket
        websocketService.sendPositionUpdate({
          player: {
            x: playerBody.position.x,
            y: playerBody.position.y,
            z: playerBody.position.z,
            rotation: playerRotation
          },
          // Only host sends ball data to maintain consistency
          ball: websocketService.isRoomHost ? ballData : undefined
        });
      }
    }
    
    // Get current key states
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
      const desiredVelocityX = direction.current.x * 15; // Target velocity for X-axis - increased from 10 to 15 for faster sideways movement
      
      // Adjust Z-axis velocity based on forward/backward direction
      const desiredVelocityZ = direction.current.z > 0 
        ? direction.current.z * 14  // Backward (S key)
        : direction.current.z * 14;  // Forward (W key) - increased from 8 to 12 for faster forward movement
      
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
    
    // JUMPING CONTROLS
    // Jump now ONLY with SHIFT key (removed W key jumping)
    if (keys.shiftJump && isOnGroundRef.current && jumpCooldownRef.current <= 0) {
      // Apply jump multiplier from ability if active
      const jumpForce = JUMP_FORCE * 60 * playerBody.mass * jumpMultiplier; // Increased from 45 to 60 for higher jumps
      applyForce(playerBody, [0, jumpForce, 0]);
      jumpCooldownRef.current = 0.3; // Shorter cooldown for responsive jumps
      
      // Log jump with different message if enhanced by ability
      if (jumpMultiplier > 1.0) {
        console.log(`🚀 SHIFT enhanced jump with force ${jumpForce.toFixed(1)} (${Math.round((jumpMultiplier-1)*100)}% boost)`);
      } else {
        console.log("SHIFT jump applied with force", jumpForce);
      }
    }
    
    // Display key mapping info occasionally for debugging
    if (frameCount.current % 600 === 0) {
      console.log(`🎮 CONTROLS: 
        WASD/Arrows: Move character
        W/Up: Move forward only
        SHIFT: Jump (doesn't move forward)
        S/Down: Move backward
        A/Left, D/Right: Move left/right
        Space: Kick the ball
        E: Use special ability
        R: Restart the game`);
    }
    
    // Kick the ball with spacebar - ENHANCED WITH PROJECTILE MOTION & ABILITY MULTIPLIERS
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
        
        // Only kick if ball is within range (now uses dynamic ballControlRadius)
        if (distance < ballControlRadius) {
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
          
          // ENHANCED PROJECTILE MOTION KICK with ABILITY MULTIPLIERS
          // Calculate initial velocity components for projectile motion
          const kickForce = KICK_POWER * kickMultiplier; // Apply ability-based kick multiplier
          
          // Calculate angle based on distance to provide better arc for projectile motion
          // For stronger kicks (higher multiplier), use a flatter trajectory
          const kickAngle = Math.PI / (2 + kickMultiplier *1); // Dynamic angle based on kick strength
          
          // Calculate velocity components for projectile motion
          const vx = playerDir.x * kickForce * 0.8;
          const vy = Math.sin(kickAngle) * kickForce * 0.9;
          const vz = playerDir.z * kickForce;
          
          // Reset ball angular velocity before applying new force
          ballBody.angularVelocity.set(0, 0, 0);
          
          // Apply the kick force using projectile motion
          ballBody.velocity.set(0, 0, 0); // Reset velocity first for more consistent kicks
          ballBody.velocity.x = vx;
          ballBody.velocity.y = vy;
          ballBody.velocity.z = vz;
          
          // Add random spin to make kick more dynamic - enhanced for stronger kicks
          const spinForce = 2 + Math.random() * 3 * kickMultiplier;
          const spinX = (Math.random() - 0.5) * spinForce;
          const spinY = (Math.random() - 0.5) * spinForce;
          const spinZ = (Math.random() - 0.5) * spinForce;
          
          ballBody.angularVelocity.set(spinX, spinY, spinZ);
          
          // Log different message based on kick strength
          if (kickMultiplier > 1.0) {
            console.log(`⚽ POWER KICK! (${Math.round((kickMultiplier-1)*100)}% boost): `, {vx, vy, vz, distance});
          } else {
            console.log("⚽ Ball kicked with projectile motion:", {vx, vy, vz, distance});
          }
          
          // Play kick sound
          playHit();
          
          // Set cooldown - shorter when abilities are active for more intense gameplay
          kickCooldownRef.current = Math.max(0.2, 0.3 / kickMultiplier);
        } else {
          // Show different message based on active ability
          if (activeAbility) {
            console.log(`Ball at distance ${distance.toFixed(1)} - get closer! (Control radius: ${ballControlRadius})`);
          } else {
            console.log("Ball too far to kick, distance:", distance);
          }
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
    
    // Special ability-specific effects that need to be applied every frame
    if (activeAbility === 'dogecoin' && isInvincible) {
      // Add upward force to simulate floating/moon gravity when jumping
      if (!isOnGroundRef.current && playerBody.velocity.y < 0) {
        // Counteract gravity partially when falling
        applyForce(playerBody, [0, playerBody.mass * 5, 0]);
      }
    }
  });
  
  // Return visual effects for active abilities - ENHANCED WITH MORE DRAMATIC EFFECTS
  if (activeAbility) {
    return (
      <group>
        {/* Visual effect for active ability */}
        {activeAbility === 'bitcoin' && (
          <>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.5, 24, 24]} />
              <meshBasicMaterial color="#f7931a" transparent opacity={0.3} />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={1} distance={4} color="#f7931a" />
            {/* Add particle trail or glow effect */}
            <sprite position={[0, 2, 0]} scale={[3, 3, 1]}>
              <spriteMaterial color="#f7931a" transparent opacity={0.5} />
            </sprite>
          </>
        )}
        
        {activeAbility === 'ethereum' && (
          <>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.5, 24, 24]} />
              <meshBasicMaterial color="#627eea" transparent opacity={0.4} wireframe />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={1.5} distance={5} color="#627eea" />
            {/* Add ethereal glow */}
            <sprite position={[0, 2, 0]} scale={[3, 3, 1]}>
              <spriteMaterial color="#627eea" transparent opacity={0.6} />
            </sprite>
          </>
        )}
        
        {activeAbility === 'dogecoin' && (
          <>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.8, 24, 24]} />
              <meshBasicMaterial color="#c3a634" transparent opacity={0.5} />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={3} distance={6} color="#c3a634" />
            <pointLight position={[0, -1, 0]} intensity={2} distance={4} color="#c3a634" />
            {/* Add trail effect */}
            <sprite position={[0, 2, 0]} scale={[4, 4, 1]}>
              <spriteMaterial color="#ffcc00" transparent opacity={0.7} />
            </sprite>
          </>
        )}
        
        {activeAbility === 'pepecoin' && (
          <>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.6, 24, 24]} />
              <meshBasicMaterial color="#5cb85c" transparent opacity={0.4} />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={2} distance={5} color="#5cb85c" />
            {/* Add meme magic glow */}
            <sprite position={[0, 2, 0]} scale={[3.5, 3.5, 1]}>
              <spriteMaterial color="#5cb85c" transparent opacity={0.6} />
            </sprite>
          </>
        )}
      </group>
    );
  }
  
  return null;
};

export default PlayerController;
