"use client";

import { Float, PointMaterial, Points, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * 门面 3D：模型由 Blender 5.2 无头模式生成（`_build/make-asset.py`），
 * 556 顶点 / 608 面 / 86KB —— 核显机器也能稳在 60fps。
 * 旋转在 R3F 里做，不烘焙动画，省 GPU 也方便调。
 */
function Orb() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/hero-orb.glb");

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.22;
    group.current.rotation.x += dt * 0.06;
  });

  return (
    <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.6}>
      <group ref={group}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

function Dust() {
  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 2.4 + Math.random() * 2.4;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.cos(p) * 0.7;
      arr[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent color="#9aa1b1" size={0.02} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

/** 资产加载失败/慢的时候先顶上，避免画面空白 */
function Fallback() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.35, 1]} />
      <meshBasicMaterial color="#c8ff4d" wireframe transparent opacity={0.45} />
    </mesh>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color="#c8ff4d" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#4b6bff" />
      <Suspense fallback={<Fallback />}>
        <Orb />
      </Suspense>
      <Dust />
    </Canvas>
  );
}

useGLTF.preload("/models/hero-orb.glb");
