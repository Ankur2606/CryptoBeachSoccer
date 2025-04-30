import { useEffect } from 'react';
import { useTexture, useGLTF } from '@react-three/drei';

// Preload assets component
const Preload = () => {
  useEffect(() => {
    // Preload textures
    useTexture.preload('/textures/sand.jpg');
    useTexture.preload('/textures/sky.png');
    useTexture.preload('/textures/grass.png');
    useTexture.preload('/textures/wood.jpg');
    
    // Preload SVG icons
    useTexture.preload('/textures/bitcoin.svg');
    useTexture.preload('/textures/ethereum.svg');
    useTexture.preload('/textures/dogecoin.svg');
    useTexture.preload('/textures/pepecoin.svg');
    useTexture.preload('/textures/male_preview.svg');
    useTexture.preload('/textures/female_preview.svg');
    
    // Preload 3D models
    useGLTF.preload('/models/characters/male_beach.glb');
    useGLTF.preload('/models/characters/female_beach.glb');
    
    // Preload audio
    new Audio('/sounds/hit.mp3');
    new Audio('/sounds/success.mp3');
    new Audio('/sounds/whistle.mp3');
    new Audio('/sounds/freeze.mp3');
    
    console.log('Preloaded assets');
  }, []);
  
  return null;
};

export default Preload;