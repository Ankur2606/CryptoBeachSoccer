import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { usePhysics } from "@/lib/stores/usePhysics";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState } from "@/lib/stores/useGameState";
import * as THREE from "three";
import { FIELD_WIDTH, FIELD_DEPTH, GRAVITY } from "../constants";
import websocketService from "@/lib/multiplayer/websocketService";
import { useCharacter } from "@/lib/stores/useCharacter";

const Ball = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const { addBody, getBody, applyForce } = usePhysics();
  const { playHit } = useAudio();
  const { isMultiplayer } = useGameState();
  const { selectedCharacter } = useCharacter();
  const [lastBounce, setLastBounce] = useState(0);
  const bounceThreshold = 2; // Minimum velocity for bounce sound
  
  // Load ball texture based on selected character - "pepe_ball" is default
  const ballTexture = useTexture(
    selectedCharacter === 'pepecoin' 
      ? "/textures/pepe_ball.svg" 
      : "/textures/pepe_ball.svg"
  );
  
  // Ball state tracking for stuck detection and manual reset
  const ballStateRef = useRef({
    lastPosition: new THREE.Vector3(),
    lastMovementTime: Date.now(),
    stuckTime: 0,
    lastResetTime: 0,
    isResetting: false,
    positionHistory: [] as THREE.Vector3[],
    earthGravityApplied: false, // Track if earth gravity has been applied
    cornerStuckTime: 0, // Track time spent in corner
    inCorner: false, // Track if ball is in corner
    lastSyncTime: 0, // Track last time position was synced for multiplayer
    isRemoteControlled: false, // If true, this client's physics will follow the other player's updates
    syncActive: false // Tracks if we're actively receiving position updates from the other player
  });
  
  // Interpolation data for smooth movement in multiplayer
  const interpolationRef = useRef({
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startVelocity: new THREE.Vector3(),
    targetVelocity: new THREE.Vector3(),
    progress: 0,
    duration: 0.1, // Duration of interpolation in seconds
  });
  
  // Manual ball reset function
  const resetBall = () => {
    const ballBody = getBody('ball');
    if (ballBody && !ballStateRef.current.isResetting) {
      // Prevent spam resets
      if (Date.now() - ballStateRef.current.lastResetTime < 1000) return;
      
      ballStateRef.current.isResetting = true;
      ballStateRef.current.lastResetTime = Date.now();
      
      // Reset ball position and physics
      ballBody.position.set(0, 1, 0);
      ballBody.velocity.set(0, 0, 0);
      ballBody.angularVelocity.set(0, 0, 0);
      
      console.log("🔄 Ball manually reset to center");
      
      // Add visual feedback
      if (ballRef.current) {
        const material = ballRef.current.material as THREE.MeshStandardMaterial;
        if (material) {
          // Flash the ball briefly
          material.emissive.set('#ffffff');
          setTimeout(() => {
            material.emissive.set('#000000');
          }, 300);
        }
      }
      
      // Allow resetting again after a delay
      setTimeout(() => {
        ballStateRef.current.isResetting = false;
      }, 500);
      
      // If in multiplayer, tell the other player we reset
      if (isMultiplayer && websocketService.isRoomActive()) {
        websocketService.sendGameReset();
      }
    }
  };

  // Add websocket event listeners for multiplayer
  useEffect(() => {
    if (!isMultiplayer) return;
    
    // Handle game reset from other player
    const handleGameReset = () => {
      console.log("🔄 Received game reset from other player");
      resetBall();
    };
    
    // Handle position updates from other player
    const handlePositionUpdate = (positionData: any) => {
      // Only process if we have ball data
      if (!positionData.data || !positionData.data.ball) return;
      
      // Mark ball as being remote controlled if we're not the host
      if (!websocketService.isRoomHost) {
        ballStateRef.current.isRemoteControlled = true;
        
        // Set up interpolation data
        const ballBody = getBody('ball');
        if (!ballBody) return;
        
        interpolationRef.current.startPosition.copy(ballBody.position);
        interpolationRef.current.targetPosition.set(
          positionData.data.ball.x,
          positionData.data.ball.y,
          positionData.data.ball.z
        );
        
        // Update velocity targets
        interpolationRef.current.startVelocity.copy(ballBody.velocity);
        if (positionData.data.ball.velocityX !== undefined) {
          interpolationRef.current.targetVelocity.set(
            positionData.data.ball.velocityX,
            positionData.data.ball.velocityY,
            positionData.data.ball.velocityZ
          );
        }
        
        // Reset interpolation progress
        interpolationRef.current.progress = 0;
        
        // Set duration based on ping/latency (adjust as needed)
        interpolationRef.current.duration = 0.1; // 100ms interpolation
        
        // Mark that we're actively receiving updates
        ballStateRef.current.syncActive = true;
        ballStateRef.current.lastSyncTime = Date.now();
      }
    };
    
    websocketService.on('game-reset', handleGameReset);
    websocketService.on('position-update', handlePositionUpdate);
    
    return () => {
      websocketService.off('game-reset', handleGameReset);
      websocketService.off('position-update', handlePositionUpdate);
    };
  }, [isMultiplayer, getBody]);
  
  // Add R key listener for manual ball reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        if (isMultiplayer) {
          // In multiplayer, only host can reset directly
          // Non-host players will get a reset command from the host
          if (websocketService.isRoomHost) {
            resetBall();
          }
        } else {
          resetBall();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMultiplayer]);
  
  // Create the ball physics body
  useEffect(() => {
    if (ballRef.current) {
      // Create the ball body in the physics world with improved properties
      addBody({
        position: [0, 1.5, 0], // Start slightly above ground
        mass: 0.45, // Standard soccer ball mass (450g) - more realistic for Earth gravity
        shape: 'sphere',
        radius: 0.5,
        material: {
          friction: 0.4,    // Increased friction for better control
          restitution: 0.8  // Increased bounciness for more action
        },
        linearDamping: 0.3, // Reduced damping for more responsive movement
        angularDamping: 0.4, // Better rotation
        userData: {
          type: 'ball',
          id: 'ball'
        },
        // Collisions will be handled in the useFrame loop
        onCollide: (body) => { 
          // Play sound for collisions with sufficient velocity
          // Check if the ball exists and get its velocity
          if (ballRef.current) {
            const tempVector = new THREE.Vector3();
            // Use type assertion to handle null case
            const ballMesh = ballRef.current as THREE.Mesh;
            const ballPos = ballMesh.getWorldPosition(tempVector);
            
            // Calculate approximate ball velocity
            const ballVelocity = Math.sqrt(
              Math.pow(ballPos.x, 2) + Math.pow(ballPos.z, 2)
            );
            
            if (ballVelocity > bounceThreshold) {
              playHit();
            }
          }
        }
      });
      
      console.log("⚽ Ball physics initialized with earth-like gravity properties");
    }
  }, [addBody, playHit]);
  
  // Update the visual ball with physics body position
  useFrame((_, delta) => {
    const ballBody = getBody('ball');
    if (ballBody && ballRef.current) {
      // For multiplayer: store ball position and velocity for sending to the other player
      if (isMultiplayer) {
        // Only store ball data for sending if we're the host or if we're not being remote controlled
        if (websocketService.isRoomHost || !ballStateRef.current.isRemoteControlled) {
          (window as any).BALL_POSITION = {
            x: ballBody.position.x,
            y: ballBody.position.y,
            z: ballBody.position.z
          };
          
          (window as any).BALL_VELOCITY = {
            x: ballBody.velocity.x,
            y: ballBody.velocity.y,
            z: ballBody.velocity.z
          };
          
          (window as any).BALL_ANGULAR_VELOCITY = {
            x: ballBody.angularVelocity.x,
            y: ballBody.angularVelocity.y,
            z: ballBody.angularVelocity.z
          };
        }
        
        // Apply interpolated positions when controlled by the other player
        if (!websocketService.isRoomHost || ballStateRef.current.isRemoteControlled) {
          // Check if we need to apply interpolation
          if (ballStateRef.current.syncActive) {
            // Update interpolation progress
            interpolationRef.current.progress += delta / interpolationRef.current.duration;
            
            // Clamp progress to [0, 1]
            const progress = Math.min(1, interpolationRef.current.progress);
            
            // Apply interpolated position and velocity - use smoothstep for more natural motion
            const t = progress * progress * (3 - 2 * progress); // Smoothstep interpolation
            
            // Interpolate position
            const newPosition = new THREE.Vector3().lerpVectors(
              interpolationRef.current.startPosition,
              interpolationRef.current.targetPosition,
              t
            );
            
            // Interpolate velocity
            const newVelocity = new THREE.Vector3().lerpVectors(
              interpolationRef.current.startVelocity,
              interpolationRef.current.targetVelocity,
              t
            );
            
            // Apply if the difference is significant
            const positionDiff = newPosition.distanceTo(ballBody.position);
            if (positionDiff > 0.05) {
              // Only update position if the difference is significant
              ballBody.position.copy(newPosition);
              ballBody.velocity.copy(newVelocity);
            }
            
            // Reset sync active state after interpolation is complete
            if (progress >= 1) {
              ballStateRef.current.syncActive = false;
            }
            
            // If we haven't received an update for a while, switch to local control
            if (Date.now() - ballStateRef.current.lastSyncTime > 1000) {
              ballStateRef.current.isRemoteControlled = false;
              ballStateRef.current.syncActive = false;
            }
          }
        }
      }
      
      // Update visual mesh with physics data
      ballRef.current.position.copy(ballBody.position as THREE.Vector3);
      ballRef.current.quaternion.copy(ballBody.quaternion as THREE.Quaternion);
      
      // Ensure Earth-like gravity is constantly applied
      // This ensures gravity feels consistent even with other forces
      if (!ballStateRef.current.earthGravityApplied) {
        // Apply precise Earth gravity force manually
        // Note: The world already has gravity, this is for fine-tuning ball behavior
        const gravityForce = new THREE.Vector3(0, GRAVITY * ballBody.mass, 0);
        applyForce(ballBody, [0, gravityForce.y, 0]);
        ballStateRef.current.earthGravityApplied = true;
        
        // Reset flag after a short time to reapply gravity consistently
        setTimeout(() => {
          ballStateRef.current.earthGravityApplied = false;
        }, 100);
      }
      
      // Enhanced boundary enforcement system
      const position = ballBody.position;
      const halfWidth = FIELD_WIDTH/2 - 0.5; // Reduced to keep ball further from edge
      const halfDepth = FIELD_DEPTH/2 - 0.5; // Reduced to keep ball further from edge
      let resetPosition = false;
      let newPos = new THREE.Vector3(position.x, position.y, position.z);
      
      // Regular field boundaries
      let boundaryHit = false;
      
      // Side boundary checks (X-axis)
      if (Math.abs(position.x) > halfWidth) {
        newPos.x = Math.sign(position.x) * halfWidth;
        ballBody.velocity.x *= -0.8; // More energetic bounce
        boundaryHit = true;
      }
      
      // End boundary checks (Z-axis) 
      // More restrictive goal area check - only allow the ball to pass through a narrower goal area
      const isInGoalArea = Math.abs(position.x) < 2.6 && (Math.abs(position.z) > halfDepth - 1);
      
      if (!isInGoalArea) {
        if (Math.abs(position.z) > halfDepth) {
          newPos.z = Math.sign(position.z) * halfDepth;
          ballBody.velocity.z *= -0.8; // More energetic bounce
          boundaryHit = true;
        }
      }
      
      // Check for out-of-bounds corners - stricter corner handling
      const cornerDistance = 2.3; // Slightly reduced to make corners more accessible
      const aiGoalZ = -halfDepth - 1;
      const playerGoalZ = halfDepth + 1;
      
      // Check if ball is in goal corners
      const isInGoalCorner = (Math.abs(position.x) > cornerDistance) && 
                             ((Math.abs(position.z - aiGoalZ) < 2.2) || (Math.abs(position.z - playerGoalZ) < 2.2));
                           
      if (isInGoalCorner) {
        // Push ball away from corners with greater force
        const directionX = position.x > 0 ? -1 : 1;
        const directionZ = position.z > 0 ? -1 : 1;
        
        // Apply stronger force to push ball out of corners
        ballBody.velocity.x += directionX * 5;
        ballBody.velocity.z += directionZ * 5;
        boundaryHit = true;
        
        console.log("⚽ Ball pushed away from goal corner");
        
        // Track time in corner
        if (!ballStateRef.current.inCorner) {
          ballStateRef.current.inCorner = true;
          ballStateRef.current.cornerStuckTime = 0;
        } else {
          ballStateRef.current.cornerStuckTime += delta;
          
          // If ball stays in corner for more than 3 seconds, reset to middle
          if (ballStateRef.current.cornerStuckTime > 3 && !ballStateRef.current.isResetting) {
            resetPosition = true;
            console.log("⚽ Ball stuck in goal corner for more than 3 seconds, resetting to middle...");
            ballStateRef.current.cornerStuckTime = 0;
          }
        }
      } else {
        // Reset corner tracking when not in corner
        ballStateRef.current.inCorner = false;
        ballStateRef.current.cornerStuckTime = 0;
      }
      
      // Play sound when ball hits boundary
      if (boundaryHit && Math.sqrt(
        ballBody.velocity.x * ballBody.velocity.x + 
        ballBody.velocity.z * ballBody.velocity.z) > 0.8) {
        playHit();
      }
      
      // Update position history for stuck detection (keep last 10 positions)
      const newPosVector = new THREE.Vector3(position.x, position.y, position.z);
      ballStateRef.current.positionHistory.push(newPosVector);
      if (ballStateRef.current.positionHistory.length > 10) {
        ballStateRef.current.positionHistory.shift();
      }
      
      // Check for stuck ball detection
      if (ballStateRef.current.positionHistory.length >= 10) {
        // Get the average movement distance over last 10 frames
        let averageMovement = 0;
        
        for (let i = 1; i < ballStateRef.current.positionHistory.length; i++) {
          averageMovement += ballStateRef.current.positionHistory[i].distanceTo(
            ballStateRef.current.positionHistory[i-1]
          );
        }
        averageMovement /= (ballStateRef.current.positionHistory.length - 1);
        
        // If almost no movement for extended time and ball is not at center, likely stuck
        if (averageMovement < 0.001 && 
            (Math.abs(position.x) > 1 || Math.abs(position.z) > 1) && 
            Math.abs(ballBody.velocity.length()) < 0.1) {
          
          ballStateRef.current.stuckTime += delta;
          
          // Reset if stuck for more than 3 seconds
          if (ballStateRef.current.stuckTime > 3) {
            resetPosition = true;
            console.log("⚽ Ball appears to be stuck, resetting...");
            ballStateRef.current.stuckTime = 0;
          }
        } else {
          // Reset stuck timer
          ballStateRef.current.stuckTime = 0;
        }
      }
      
      // Add earth-like gravity behavior: Ball should eventually come to rest
      // If ball is very close to ground and moving slowly, gradually slow it down
      if (position.y < 0.6 && Math.abs(ballBody.velocity.y) < 0.5) {
        // Gradually reduce velocity when ball is on ground to simulate natural rest
        ballBody.velocity.x *= 0.98;
        ballBody.velocity.z *= 0.98;
      }
      
      // Reset ball if it falls off the field or gets stuck
      if (position.y < -5 || position.y > 20 || 
          // Additional stuck detection
          (Math.abs(position.x) > FIELD_WIDTH + 5 || Math.abs(position.z) > FIELD_DEPTH + 5)) {
        resetPosition = true;
      }
      
      // Reset ball if it's in the "dead zone" behind the goal posts
      const isInDeadZone = (Math.abs(position.x) > 3.5 && Math.abs(position.z) > halfDepth + 0.5);
      if (isInDeadZone) {
        resetPosition = true;
        console.log("⚽ Ball was in dead zone behind goal posts, resetting...");
      }
      
      // Apply position reset if needed
      if (resetPosition && !ballStateRef.current.isResetting) {
        resetBall();
      }
    }
  });
  
  // Render the ball
  return (
    <mesh 
      ref={ballRef} 
      castShadow 
      receiveShadow
      position={[0, 1.5, 0]} 
      name="game_ball"
    >
      <sphereGeometry args={[0.5, 32, 16]} />
      <meshStandardMaterial 
        map={ballTexture} 
        roughness={0.4} 
        metalness={0.1}
      />
      
      {/* Optional emission effect for power hits */}
      <pointLight intensity={0} position={[0, 0, 0]} distance={3} color="#ffffff" />
    </mesh>
  );
};

export default Ball;
