import { useEffect, useState } from 'react';
import { useAudio } from '../stores/useAudio';

// Custom hook for managing game sounds
export function useSound() {
  const { 
    setBackgroundMusic,
    setHitSound,
    setSuccessSound,
    playHit,
    playSuccess,
    toggleMute,
    isMuted
  } = useAudio();
  
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load all sound effects on mount
  useEffect(() => {
    // Background music
    const bgMusic = new Audio('/sounds/background2.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);
    
    // Hit sound effect
    const hit = new Audio('/sounds/hit.mp3');
    hit.volume = 0.5;
    setHitSound(hit);
    
    // Success sound effect
    const success = new Audio('/sounds/success.mp3');
    success.volume = 0.6;
    setSuccessSound(success);
    
    // Mark sounds as loaded
    setIsLoaded(true);
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);
  
  return {
    isLoaded,
    playHit,
    playSuccess,
    toggleMute,
    isMuted
  };
}
