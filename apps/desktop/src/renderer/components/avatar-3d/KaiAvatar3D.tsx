import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { AvatarEnvironment } from './AvatarEnvironment';
import { AvatarModel } from './AvatarModel';
import type { KaiAvatar3DState } from './KaiAvatar3DState';

export interface KaiAvatar3DProps {
  state: KaiAvatar3DState;
  modelUrl?: string;
  className?: string;
}

const Loader = () => (
  <Html center>
    <div style={{ color: '#60a5fa', fontFamily: 'monospace' }}>Loading Asset...</div>
  </Html>
);

export const KaiAvatar3D: React.FC<KaiAvatar3DProps> = ({ state, modelUrl, className }) => {
  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: 300 }}>
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 1.5, 4], fov: 45 }}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={<Loader />}>
          <AvatarEnvironment />
          <AvatarModel state={state} modelUrl={modelUrl} />
          {/* Prevent user from completely losing the avatar by restricting orbit */}
          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            minPolarAngle={Math.PI / 3} 
            maxPolarAngle={Math.PI / 2} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
