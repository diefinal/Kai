import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Text, Float } from '@react-three/drei';
import type { KaiAvatar3DState } from './KaiAvatar3DState';
import * as THREE from 'three';

interface AvatarModelProps {
  modelUrl?: string;
  state: KaiAvatar3DState;
}

export const AvatarPlaceholder: React.FC = () => {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 1, 0.1]} />
        <meshStandardMaterial color="#1e293b" opacity={0.8} transparent />
        <Text
          position={[0, 0.2, 0.06]}
          fontSize={0.2}
          color="#60a5fa"
          anchorX="center"
          anchorY="middle"
        >
          [ 3D Preview ]
        </Text>
        <Text
          position={[0, -0.2, 0.06]}
          fontSize={0.15}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          Official Kai Character Not Installed
        </Text>
      </mesh>
    </Float>
  );
};

export const AvatarModel: React.FC<AvatarModelProps> = ({ modelUrl, state }) => {
  // If no URL is provided, return the strict placeholder
  if (!modelUrl) {
    return <AvatarPlaceholder />;
  }

  // Future implementation of the actual model loading
  // const { scene, animations } = useGLTF(modelUrl);
  // const { actions } = useAnimations(animations, scene);
  
  // useEffect(() => {
  //   // Handle animation transitions based on \state\
  //   // Example: actions['idle']?.play();
  // }, [state, actions]);

  // return <primitive object={scene} />;
  
  return <AvatarPlaceholder />;
};

// Preload standard URL if needed later
// useGLTF.preload('/models/kai.glb');
