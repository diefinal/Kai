/**
 * AvatarModel Component
 *
 * Mandatory Reference: /docs/KAI_IDENTITY.md
 * Kai Identity is frozen and locked.
 * Character loading must always reference OfficialKai through CharacterRegistry.
 * If an avatar cannot be loaded, display 'Official Kai asset missing.'
 * Never render another model, robot, placeholder, or fallback character.
 */

import React, { useRef, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Text, Float } from '@react-three/drei';
import { CharacterRegistry } from '@kai/avatar-engine';
import type { KaiAvatar3DState } from './KaiAvatar3DState';
import * as THREE from 'three';

interface AvatarModelProps {
  modelUrl?: string;
  state: KaiAvatar3DState;
}

export const OfficialKaiAssetMissing: React.FC = () => {
  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 0.8, 0.08]} />
        <meshStandardMaterial color="#0f172a" opacity={0.85} transparent />
        <Text
          position={[0, 0, 0.05]}
          fontSize={0.14}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          Official Kai asset missing.
        </Text>
      </mesh>
    </Float>
  );
};

export const AutoFittedModel: React.FC<{ object: THREE.Object3D }> = ({ object }) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    // Automatically compute model bounds
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Center the model automatically
    groupRef.current.position.x = -center.x;
    groupRef.current.position.y = -center.y;
    groupRef.current.position.z = -center.z;

    // Automatic Camera Fit & Auto Scale (10% padding)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0 && camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
      cameraDistance *= 1.1; // 10% padding so head and feet are never cropped

      camera.position.set(0, 0, cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [object, camera]);

  return (
    <group ref={groupRef}>
      <primitive object={object} />
    </group>
  );
};

export const LoadedModelContent: React.FC<{ url: string; state: KaiAvatar3DState }> = ({ url, state }) => {
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, scene);

  useLayoutEffect(() => {
    const currentAction = actions[state] || actions['idle'] || Object.values(actions)[0];
    if (currentAction) {
      currentAction.reset().fadeIn(0.2).play();
      return () => {
        currentAction.fadeOut(0.2);
      };
    }
  }, [state, actions]);

  return <AutoFittedModel object={scene} />;
};

export const AvatarModel: React.FC<AvatarModelProps> = ({ modelUrl, state }) => {
  // Always resolve model path via CharacterRegistry
  const targetUrl = modelUrl || CharacterRegistry.getModelPath();

  if (!targetUrl || !CharacterRegistry.validateAssetPath(targetUrl)) {
    return <OfficialKaiAssetMissing />;
  }

  return (
    <React.Suspense fallback={<OfficialKaiAssetMissing />}>
      <LoadedModelContent url={targetUrl} state={state} />
    </React.Suspense>
  );
};
