import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, PerspectiveCamera } from '@react-three/drei';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { useCharacter } from '@/lib/stores/useCharacter';
import Lighting from '../components/Lighting';
import Beach from '../components/Beach';
import Ball from '../components/Ball';
import Characters from '../components/Characters';
import Goals from '../components/Goals';
import Effects from '../components/Effects';
import PlayerController from '../components/PlayerController';
import AIController from '../components/AIController';
import PhysicsWorld from '../components/PhysicsWorld';
import GameUI from '../ui/GameUI';
import TouchControls from '../components/TouchControls';
import { useIsMobile } from '@/hooks/use-is-mobile';

const GameScreen = () => {
  const { gameState, setGameState, resetGame } = useGameState();
  const { backgroundMusic } = useAudio();
  const { selectedCharacter } = useCharacter();
  const isMobile = useIsMobile();
  
  // Set up game when component mounts
  useEffect(() => {
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
            
            {/* AI controller */}
            <AIController />
          </PhysicsWorld>
          
          {/* Post-processing effects */}
          <Effects />
        </Suspense>
        
        {/* Development camera controls - disable in production */}
        {process.env.NODE_ENV === 'development' && <OrbitControls />}
      </Canvas>
      
      {/* Game UI overlay */}
      <GameUI />
      
      {/* Mobile touch controls */}
      {isMobile && <TouchControls />}
    </>
  );
};

export default GameScreen;
