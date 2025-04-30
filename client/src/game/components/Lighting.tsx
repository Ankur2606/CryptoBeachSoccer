import { useEffect, useRef } from "react";
import * as THREE from "three";

const Lighting = () => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  // Setup shadow camera once the component mounts
  useEffect(() => {
    if (directionalLightRef.current) {
      const light = directionalLightRef.current;
      
      // Configure shadows
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      
      const d = 20;
      light.shadow.camera.left = -d;
      light.shadow.camera.right = d;
      light.shadow.camera.top = d;
      light.shadow.camera.bottom = -d;
      light.shadow.camera.far = 50;
      light.shadow.bias = -0.0005;
    }
  }, []);
  
  return (
    <>
      {/* Main directional light (sun) */}
      <directionalLight
        ref={directionalLightRef}
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
      />
      
      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.6} />
      
      {/* Hemisphere light for better environment lighting */}
      <hemisphereLight 
        args={['#87CEEB', '#FFEFD5', 0.6]} 
        position={[0, 50, 0]} 
      />
    </>
  );
};

export default Lighting;
