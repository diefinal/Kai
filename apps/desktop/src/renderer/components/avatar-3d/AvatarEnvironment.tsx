import React from 'react';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';

export const AvatarEnvironment: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={45} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <spotLight position={[-5, 5, 5]} intensity={0.5} angle={0.3} penumbra={1} />
      
      <Environment preset="city" />
      
      <ContactShadows 
        position={[0, 0, 0]} 
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
