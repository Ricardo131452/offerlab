"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * 门面 3D：程序化几何 + 线框，不用外部模型。
 * 约束：核显机器上也要稳在 60fps——所以没有后处理、没有阴影、顶点数 < 3k。
 * 后续若要接 Blender 资产，只替换 Icosahedron 部分为 useGLTF 即可。
 */
function Knot() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.25;
      ref.current.rotation.x += dt * 0.08;
    }
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.7}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshBasicMaterial color="#c8ff4d" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#101218" roughness={0.35} metalness={0.6} />
      </mesh>
    </Float>
  );
}

function Dust() {
  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 2.2 + Math.random() * 2.6;
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

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#c8ff4d" />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#4b6bff" />
      <Knot />
      <Dust />
    </Canvas>
  );
}
