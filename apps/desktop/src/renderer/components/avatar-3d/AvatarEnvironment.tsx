import React from 'react';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';

export const AvatarEnvironment: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={45} near={0.1} far={100} />
      
      {/* Comprehensive omni and directional lighting to avoid any dark clipping */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-5, 2, -5]} intensity={0.5} />
      <spotLight position={[0, 5, 5]} intensity={0.6} angle={0.6} penumbra={1} />
      
      <Environment preset="city" />
      
      <ContactShadows 
        position={[0, -1, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2} 
        far={10} 
        resolution={256} 
        color="#000000" 
      />
    </>
  );
};
