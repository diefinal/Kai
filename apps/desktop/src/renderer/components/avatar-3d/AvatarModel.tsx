/**
 * AvatarModel Component
 *
 * Mandatory Reference: /docs/KAI_IDENTITY.md
 * Kai Identity is frozen and locked.
 * Character loading must always reference OfficialKai through CharacterRegistry.
 * If an avatar cannot be loaded, display 'Official Kai asset missing.'
 * Never render another model, robot, placeholder, or fallback character.
 */

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Text, Float } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
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
  const isFittedRef = useRef(false);
  const frameCountRef = useRef(0);

  useLayoutEffect(() => {
    // Ensure Box3 fitting and camera framing runs ONLY once after model load
    if (!groupRef.current || isFittedRef.current) return;

    // Compute bounding box once from the object in its local space
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Apply centering offset once to the container group to prevent repeated recentering
    groupRef.current.position.set(-center.x, -center.y, -center.z);
    groupRef.current.updateMatrixWorld(true);

    // Freeze camera after initial fit (10% padding so head and feet are never cropped)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0 && camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
      cameraDistance *= 1.1;

      camera.position.set(0, 0, cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    isFittedRef.current = true;
  }, [object, camera]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Print world matrix and verify position/scale for 10 consecutive frames
    if (frameCountRef.current < 10) {
      frameCountRef.current += 1;
      const pos = groupRef.current.position;
      const rot = groupRef.current.rotation;
      const scale = groupRef.current.scale;
      const m = groupRef.current.matrixWorld.elements;
      console.log(
        `[Transform Frame ${frameCountRef.current}] ` +
        `pos=(${pos.x.toFixed(4)}, ${pos.y.toFixed(4)}, ${pos.z.toFixed(4)}) ` +
        `rot=(${rot.x.toFixed(4)}, ${rot.y.toFixed(4)}, ${rot.z.toFixed(4)}) ` +
        `scale=(${scale.x.toFixed(4)}, ${scale.y.toFixed(4)}, ${scale.z.toFixed(4)}) ` +
        `worldMatrix=[${m.map((e) => e.toFixed(2)).join(', ')}]`
      );
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={object} />
    </group>
  );
};

export const LoadedModelContent: React.FC<{ url: string; state: KaiAvatar3DState }> = ({ url, state }) => {
  const { scene, animations } = useGLTF(url);
  // Do not mutate loaded scene directly; clone scene before applying transforms
  const clonedScene = useMemo(() => clone(scene), [scene]);
  const { actions } = useAnimations(animations, clonedScene);

  useLayoutEffect(() => {
    const currentAction = actions[state] || actions['idle'] || Object.values(actions)[0];
    if (currentAction) {
      currentAction.reset().fadeIn(0.2).play();
      return () => {
        currentAction.fadeOut(0.2);
      };
    }
  }, [state, actions]);

  return <AutoFittedModel object={clonedScene} />;
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
