import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, PerspectiveCamera } from '@react-three/drei';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { useCharacter } from '@/lib/stores/useCharacter';
import { usePhysics } from '@/lib/stores/usePhysics';
import Lighting from '../components/Lighting';
import Beach from '../components/Beach';
import Ball from '../components/Ball';
import Characters from '../components/Characters';
import Goals from '../components/Goals';
import Effects from '../components/Effects';
import PlayerController from '../components/PlayerController';
import AIController from '../components/AIController';
import MultiplayerController from '../components/MultiplayerController';
import PhysicsWorld from '../components/PhysicsWorld';
import Abilities from '../components/Abilities';
import GameUI from '../ui/GameUI';
import TouchControls from '../components/TouchControls';
import { useIsMobile } from '@/hooks/use-is-mobile';

const GameScreen = () => {
  const { 
    gameState, 
    setGameState, 
    resetGame,
    isMultiplayer,
    opponentName
  } = useGameState();
  const { backgroundMusic } = useAudio();
  const { selectedCharacter } = useCharacter();
  const { initPhysics, cleanup } = usePhysics();
  const isMobile = useIsMobile();
  const [cannonLoaded, setCannonLoaded] = useState(false);
  const initAttempts = useRef(0);
  
  // Load CANNON.js
  useEffect(() => {
    console.log("GameScreen mounted, checking CANNON.js availability");
    
    // Function to load CANNON.js
    const loadCannon = () => {
      if (typeof window !== 'undefined' && !(window as any).CANNON) {
        console.log(`Loading CANNON.js (attempt ${initAttempts.current + 1})`);
        initAttempts.current += 1;
        
        // Load CANNON.js script
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
        script.async = false; // Load synchronously
        
        script.onload = () => {
          console.log("CANNON.js loaded successfully");
          setCannonLoaded(true);
          initPhysics();
        };
        
        script.onerror = () => {
          console.error("Failed to load CANNON.js");
          // Retry loading if we haven't reached max attempts
          if (initAttempts.current < 3) {
            setTimeout(loadCannon, 1000);
          }
        };
        
        document.head.appendChild(script);
      } else if ((window as any).CANNON) {
        console.log("CANNON.js already loaded");
        setCannonLoaded(true);
        initPhysics();
      }
    };
    
    loadCannon();
    
    return () => {
      console.log("GameScreen unmounting, cleaning up physics");
      cleanup();
    };
  }, [initPhysics, cleanup]);
  
  // Set up game when component mounts
  useEffect(() => {
    console.log("Setting up game timer and music");
    
    // Continue background music if it's playing
    if (backgroundMusic) {
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
    
    // Set up game timer (3 minutes)
    const gameTimer = setTimeout(() => {
      // End game after 3 minutes
      setGameState('game_over');
    }, 3 * 60 * 1000);
    
    return () => {
      clearTimeout(gameTimer);
    };
  }, [backgroundMusic, setGameState]);
  
  return (
    <>
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[0, 8, 15]} 
          fov={50}
          near={0.1}
          far={1000}
        />
        
        <color attach="background" args={['#87CEEB']} />
        
        {/* Environment */}
        <Sky 
          distance={450000} 
          sunPosition={[0, 1, 0]} 
          inclination={0.5} 
          azimuth={0.25} 
        />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Lighting setup */}
        <Lighting />
        
        <Suspense fallback={null}>
          {/* Physics world wrapper */}
          <PhysicsWorld>
            {/* Game elements */}
            <Beach />
            <Goals />
            <Ball />
            <Characters />
            
            {/* Player controller */}
            <PlayerController character={selectedCharacter} />
            
            {/* AI controller - only in single player mode */}
            {!isMultiplayer && <AIController />}

            {/* Crypto-themed ability pickups */}
            <Abilities />
          </PhysicsWorld>
          
          {/* Post-processing effects */}
          <Effects />
        </Suspense>
        
        {/* Camera controls - now enabled in all environments */}
        <OrbitControls />
      </Canvas>
      
      {/* Game UI overlay */}
      <GameUI />
      
      {/* Mobile touch controls */}
      {isMobile && <TouchControls />}
      
      {/* Multiplayer controller for game state synchronization */}
      {isMultiplayer && <MultiplayerController />}
    </>
  );
};

export default GameScreen;
