import { useEffect, useState } from 'react';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useGameState } from '@/lib/stores/useGameState';

const Effects = () => {
  const { gameState } = useGameState();
  const [intensity, setIntensity] = useState(0.1);
  
  // Modify effects based on game state
  useEffect(() => {
    if (gameState === 'game_over') {
      setIntensity(0.5);
    } else {
      setIntensity(0.1);
    }
  }, [gameState]);
  
  return (
    <EffectComposer>
      {/* Bloom effect for glowing elements */}
      <Bloom 
        intensity={intensity} 
        luminanceThreshold={0.2} 
        luminanceSmoothing={0.9} 
        height={300} 
      />
      
      {/* Subtle noise for texture */}
      <Noise 
        opacity={0.02} 
        blendFunction={BlendFunction.NORMAL} 
      />
      
      {/* Vignette for edge darkening */}
      <Vignette 
        offset={0.5} 
        darkness={0.5} 
        blendFunction={BlendFunction.NORMAL} 
      />
    </EffectComposer>
  );
};

export default Effects;
