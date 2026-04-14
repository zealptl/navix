/**
 * StarMap3D — Three-zone LOD star map with trajectory visualization.
 *
 * Zone 1 (tasks 5.1–5.5): Individual stars < 200 ly, instanced mesh sprites.
 * Zone 2 (tasks 6.1–6.3): Orion Arm point cloud < 5,000 ly, BufferGeometry Points.
 * Zone 3 (tasks 7.1–7.5): Procedural Milky Way galaxy, ~500k particles.
 * LOD  (tasks 8.1–8.5):   Smooth opacity crossfades driven by camera distance.
 * Trajectory (tasks 9.1–9.3): Glowing line + ship icon between selected stars.
 *
 * Coordinate convention:
 *   - Three.js world origin = Sun / Earth (HYG origin).
 *   - Zone 1/2 star positions: HYG x/y/z (parsecs) × PC_TO_LY → world units (ly).
 *   - Zone 3 galaxy: generated in galactic coords (center = origin), then offset
 *     by (-SUN_GALACTIC_X, 0, 0) so the Sun stays at world origin.
 */

import { Component, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSimStore, type Star } from '../store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PC_TO_LY = 3.26156;

// ---------------------------------------------------------------------------
// Zone tier config
// ---------------------------------------------------------------------------

export type ZoneTier = 'famous' | 'naked-eye' | 'binocular' | 'all';

interface ZoneTierConfig {
  tier: ZoneTier;
  label: string;
  fetchUrl: string;
}

const ZONE_TIERS: ZoneTierConfig[] = [
  { tier: 'famous',     label: 'Famous',     fetchUrl: '/api/stars/famous' },
  { tier: 'naked-eye',  label: 'Naked Eye',  fetchUrl: '/api/stars/nearby?ly=200&max_mag=6.5' },
  { tier: 'binocular',  label: 'Binocular',  fetchUrl: '/api/stars/nearby?ly=200&max_mag=8' },
  { tier: 'all',        label: 'All Nearby', fetchUrl: '/api/stars/nearby?ly=200' },
];


/** Approximate distance of the Sun from the galactic center (ly). */
const SUN_GALACTIC_X = 26_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TweenTarget {
  pos: THREE.Vector3;
  orbitTarget: THREE.Vector3;
}

interface GalaxyData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

// ---------------------------------------------------------------------------
// 14.3 StarMapSkeleton — skeleton loading state (not a spinner)
// ---------------------------------------------------------------------------

// Fixed dot positions: [left%, top%, diameter px, opacity]
const SKELETON_DOTS: [number, number, number, number][] = [
  [15, 22, 3, 0.8], [42, 10, 2, 0.5], [65, 28, 4, 0.9], [80, 12, 2, 0.6],
  [28, 48, 3, 0.7], [72, 55, 2, 0.5], [50, 70, 3, 0.8], [90, 42, 2, 0.6],
  [10, 75, 4, 0.7], [35, 85, 2, 0.5], [60, 90, 3, 0.6], [88, 78, 2, 0.7],
  [20, 38, 2, 0.4], [55, 42, 4, 0.8], [78, 88, 3, 0.5], [44, 60, 2, 0.6],
];

function StarMapSkeleton() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#00000a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 10,
      }}
    >
      {/* Skeleton star field — suggests what's loading without a spinner */}
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        {SKELETON_DOTS.map(([left, top, size, opacity], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              background: '#334155',
              opacity,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
      <div
        style={{
          color: '#334155',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Loading stellar catalog…
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14.4 CanvasErrorBoundary — catches R3F / WebGL errors
// ---------------------------------------------------------------------------

interface ErrorBoundaryState { hasError: boolean }

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#0a0e1a',
            color: '#475569',
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 22, color: '#334155' }}>⚠</div>
          <div>3D rendering unavailable</div>
          <div style={{ fontSize: 10, color: '#334155' }}>
            Your browser may not support WebGL. Try refreshing the page.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Hermite smoothstep — returns 0 below edge0, 1 above edge1. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Box-Muller normal variate. */
function randn(): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.max(1e-10, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------------
// Star helpers (shared by Zone 1 and Zone 2)
// ---------------------------------------------------------------------------

function spectralColor(spectralType: string | null): THREE.Color {
  if (!spectralType) return new THREE.Color('#FFFFFF');
  const t = spectralType[0].toUpperCase();
  switch (t) {
    case 'O':
    case 'B':
      return new THREE.Color('#A0BCFF');
    case 'A':
    case 'F':
      return new THREE.Color('#F8F0E0');
    case 'G':
      return new THREE.Color('#FFE87C');
    case 'K':
      return new THREE.Color('#FFA550');
    case 'M':
      return new THREE.Color('#FF6B50');
    default:
      return new THREE.Color('#FFFFFF');
  }
}

function magnitudeToRadius(mag: number | null): number {
  if (mag === null) return 0.04;
  const clamped = Math.max(-2, Math.min(10, mag));
  return THREE.MathUtils.mapLinear(clamped, -2, 10, 0.1, 0.02);
}

function starPos(star: Star): THREE.Vector3 {
  return new THREE.Vector3(
    star.x * PC_TO_LY,
    star.y * PC_TO_LY,
    star.z * PC_TO_LY,
  );
}

// ---------------------------------------------------------------------------
// Galaxy generation (tasks 7.1, 7.2)
// ---------------------------------------------------------------------------

/**
 * Procedurally generate ~500k particles for the Milky Way.
 * Positions are in Three.js world-space (Sun at origin).
 *
 * Regions:
 *   Bulge  (~50k): Gaussian ellipsoid at galactic center
 *   Arms   (~300k): 4 logarithmic spirals, blue-white young stars
 *   Disk   (~100k): Exponential-falloff thin disk, dim reddish
 *   Halo   (~20k):  Sparse spherical shell, very dim
 */
function generateGalaxy(): GalaxyData {
  const MAX_PARTICLES = 500_000;
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  let idx = 0;

  const push = (
    gx: number, gy: number, gz: number,
    r: number, g: number, b: number,
  ) => {
    if (idx >= MAX_PARTICLES) return;
    // Convert galactic coords (center at origin) → world coords (Sun at origin)
    positions[idx * 3]     = gx - SUN_GALACTIC_X;
    positions[idx * 3 + 1] = gy;
    positions[idx * 3 + 2] = gz;
    colors[idx * 3]     = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
    idx++;
  };

  // ── Bulge: ~50k particles, Gaussian ellipsoid ──────────────────────────
  const BULGE_R = 3_000;
  const BULGE_Y = 1_500;
  for (let j = 0; j < 50_000; j++) {
    const x = randn() * BULGE_R;
    const y = randn() * BULGE_Y;
    const z = randn() * BULGE_R;
    // Old stars: yellow-orange
    push(x, y, z, 1.0, 0.72 + Math.random() * 0.18, 0.25 + Math.random() * 0.2);
  }

  // ── Spiral arms: 4 × 75k = 300k particles ──────────────────────────────
  //   Logarithmic spiral: r(θ) = R0 · exp(B · θ)
  //   B=0.3 matches observed Milky Way arm pitch angle (~17°).
  const B = 0.3;
  const R0 = 3_500;       // inner radius (ly) where arms begin
  const R_MAX = 50_000;    // outer cutoff (ly)
  const THETA_MAX = Math.log(R_MAX / R0) / B; // ≈ 9.4 rad → ~1.5 turns

  for (let arm = 0; arm < 4; arm++) {
    const armPhase = (arm * Math.PI) / 2; // 0°, 90°, 180°, 270°

    for (let j = 0; j < 75_000; j++) {
      const t = Math.random();           // 0..1 along arm
      const theta = t * THETA_MAX;
      const r = R0 * Math.exp(B * theta);
      const angle = theta + armPhase;

      // Scatter widens toward outer arm
      const scatter = 600 + 1_400 * t;
      const dy = 150 + 350 * t;

      const x = r * Math.cos(angle) + randn() * scatter;
      const z = r * Math.sin(angle) + randn() * scatter;
      const y = randn() * dy;

      // Young stars: blue-white
      const bright = 0.55 + Math.random() * 0.45;
      push(x, y, z, bright * 0.65, bright * 0.78, bright);
    }
  }

  // ── Thin disk: ~100k particles, exponential radial falloff ─────────────
  const DISK_H = 12_000; // exponential scale length (ly)
  const DISK_R_MAX = 60_000;
  const DISK_Z_SIGMA = 400; // ly
  let disk = 0;
  while (disk < 100_000 && idx < MAX_PARTICLES) {
    const r_try = Math.random() * DISK_R_MAX;
    if (Math.random() > Math.exp(-r_try / DISK_H)) continue; // rejection sample
    const angle = Math.random() * Math.PI * 2;
    const x = r_try * Math.cos(angle);
    const z = r_try * Math.sin(angle);
    const y = randn() * DISK_Z_SIGMA;
    const dim = 0.12 + Math.random() * 0.18;
    push(x, y, z, dim, dim * 0.5, dim * 0.42);
    disk++;
  }

  // ── Halo: ~20k particles, sparse spherical shell ────────────────────────
  for (let j = 0; j < 20_000; j++) {
    const r = 8_000 + Math.random() * 52_000;
    const cosTheta = 2 * Math.random() - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;
    const x = r * sinTheta * Math.cos(phi);
    const y = r * cosTheta * 0.45; // flatten halo vertically
    const z = r * sinTheta * Math.sin(phi);
    const dim = 0.06 + Math.random() * 0.09;
    push(x, y, z, dim, dim * 0.72, dim * 0.62);
  }

  return {
    positions: positions.slice(0, idx * 3),
    colors: colors.slice(0, idx * 3),
    count: idx,
  };
}

// ---------------------------------------------------------------------------
// PulsingRing — glowing ring for origin (green) / destination (orange)
// ---------------------------------------------------------------------------

function PulsingRing({ star, color }: { star: Star; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pos = starPos(star);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const s = 1 + 0.25 * Math.sin(clock.elapsedTime * 3);
    ringRef.current.scale.setScalar(s);
  });

  return (
    <Billboard position={pos}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}

// ---------------------------------------------------------------------------
// DistanceRing — single galactic-plane distance shell for one famous star
// ---------------------------------------------------------------------------

interface DistanceRingProps {
  star: Star;
  /** Angle (radians) around the ring where the label is anchored. */
  labelAngle: number;
}

function DistanceRing({ star, labelAngle }: DistanceRingProps) {
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const color = useMemo(() => spectralColor(star.spectral_type), [star.spectral_type]);

  const r = star.distance_ly;
  const starXLy = star.x * PC_TO_LY;
  const starYLy = star.y * PC_TO_LY;
  const starZLy = star.z * PC_TO_LY;
  const hasDropLine = Math.abs(starYLy) >= 0.1;

  // Task 3.3: label position on ring circumference, lifted 0.5 ly above plane
  const labelX = Math.sin(labelAngle) * r;
  const labelZ = Math.cos(labelAngle) * r;

  // Task 2.2: drop-line as a THREE.Line primitive, created once
  const dropLine = useMemo(() => {
    if (!hasDropLine) return null;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(starXLy, 0, starZLy),
      new THREE.Vector3(starXLy, starYLy, starZLy),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [hasDropLine, starXLy, starYLy, starZLy, color]);

  // Task 4.1/4.2: LOD fade — mirrors Zone 1 smoothstep(100, 300)
  useFrame(({ camera }) => {
    const dist = camera.position.length();
    const zone1Opacity = 1 - smoothstep(100, 300, dist);
    if (ringMatRef.current) ringMatRef.current.opacity = zone1Opacity * 0.35;
    if (dropLine) (dropLine.material as THREE.LineBasicMaterial).opacity = zone1Opacity * 0.2;
  });

  const colorHex = `#${color.getHexString()}`;

  return (
    <group>
      {/* Task 1.3/1.4: ring flat on galactic plane (y = 0) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.15, r + 0.15, 128]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Task 2.2/2.3: drop-line from galactic plane to star's actual position */}
      {dropLine && <primitive object={dropLine} />}

      {/* Task 3.4: label with name + distance */}
      <Html position={[labelX, 0.5, labelZ]}>
        <div
          style={{
            color: colorHex,
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textShadow: '0 0 6px rgba(0,0,0,1)',
            letterSpacing: '0.04em',
            opacity: 0.85,
          }}
        >
          {star.proper_name ?? star.bayer_name}{'  '}{r.toFixed(1)} ly
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// DistanceRings — container: filters, sorts, staggered labels, renders rings
// ---------------------------------------------------------------------------

function DistanceRings({ stars }: { stars: Star[] }) {
  // Task 1.2: only famous stars within 100 ly
  const nearbyFamous = useMemo(
    () => stars.filter((s) => s.is_famous && s.distance_ly <= 100),
    [stars],
  );

  // Tasks 3.1/3.2: sort by distance ascending; stagger labels 45° when radii
  // are within 0.5 ly of each other so they don't collide.
  const starsWithAngles = useMemo(() => {
    const sorted = [...nearbyFamous].sort((a, b) => a.distance_ly - b.distance_ly);
    const result: { star: Star; labelAngle: number }[] = [];
    let prevDist = -999;
    let angleOffset = 0;
    for (const star of sorted) {
      if (Math.abs(star.distance_ly - prevDist) <= 0.5) {
        angleOffset += Math.PI / 4; // +45° per collision
      } else {
        angleOffset = 0;
      }
      result.push({ star, labelAngle: angleOffset });
      prevDist = star.distance_ly;
    }
    return result;
  }, [nearbyFamous]);

  if (nearbyFamous.length === 0) return null;

  return (
    <>
      {starsWithAngles.map(({ star, labelAngle }) => (
        <DistanceRing key={star.id} star={star} labelAngle={labelAngle} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Zone1Stars — instanced mesh of nearby stars (tasks 5.2–5.5)
// With LOD opacity (task 8.1/8.2) and double-click camera tween (task 8.3)
// ---------------------------------------------------------------------------

interface Zone1StarsProps {
  stars: Star[];
  tweenTargetRef: React.MutableRefObject<TweenTarget | null>;
}

function Zone1Stars({ stars, tweenTargetRef }: Zone1StarsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { setOrigin, setDestination, origin, destination } = useSimStore();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Populate instance matrices + colors whenever the star list changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || stars.length === 0) return;
    stars.forEach((star, i) => {
      dummy.position.set(star.x * PC_TO_LY, star.y * PC_TO_LY, star.z * PC_TO_LY);
      dummy.scale.setScalar(magnitudeToRadius(star.magnitude));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, spectralColor(star.spectral_type));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [stars, dummy]);

  // LOD opacity: Zone 1 fully visible < 100 ly, fades 100–300 ly (task 8.1/8.2)
  useFrame(({ camera }) => {
    if (!matRef.current) return;
    const dist = camera.position.length();
    matRef.current.opacity = 1 - smoothstep(100, 300, dist);
  });

  const handlePointerOver = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId !== undefined) setHoveredIdx(e.instanceId);
    },
    [],
  );

  const handlePointerOut = useCallback(() => setHoveredIdx(null), []);

  const handleClick = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId !== undefined) setOrigin(stars[e.instanceId]);
    },
    [stars, setOrigin],
  );

  const handleContextMenu = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId !== undefined) setDestination(stars[e.instanceId]);
    },
    [stars, setDestination],
  );

  // Task 8.3: double-click smoothly tweens camera to orbit the star
  const handleDoubleClick = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId === undefined) return;
      const star = stars[e.instanceId];
      const pos = starPos(star);
      // Orbit at ~3 ly from the star
      const orbitDist = Math.max(0.5, star.distance_ly * 0.02 + 2);
      tweenTargetRef.current = {
        pos: pos.clone().add(new THREE.Vector3(0, orbitDist * 0.3, orbitDist)),
        orbitTarget: pos.clone(),
      };
    },
    [stars, tweenTargetRef],
  );

  const hoveredStar = hoveredIdx !== null ? stars[hoveredIdx] : null;

  if (stars.length === 0) return null;

  return (
    <>
      <instancedMesh
        key={stars.length}
        ref={meshRef}
        args={[undefined, undefined, stars.length]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial ref={matRef} transparent depthWrite={false} />
      </instancedMesh>

      {hoveredStar && (
        <Html position={starPos(hoveredStar)} distanceFactor={10}>
          <div
            style={{
              background: 'rgba(15,23,42,0.92)',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '4px 8px',
              color: '#f1f5f9',
              fontSize: '11px',
              lineHeight: '1.4',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {hoveredStar.proper_name ?? hoveredStar.bayer_name ?? 'Unknown'}
            </div>
            <div style={{ color: '#94a3b8' }}>
              {hoveredStar.distance_ly.toFixed(2)} ly
            </div>
          </div>
        </Html>
      )}

      {origin && <PulsingRing star={origin} color="#22c55e" />}
      {destination && <PulsingRing star={destination} color="#f97316" />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Zone2Stars — Orion Arm dense point cloud (tasks 6.1–6.3)
// ---------------------------------------------------------------------------

function Zone2Stars() {
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const { setOrigin, setDestination } = useSimStore();

  // Task 6.1: fetch stars < 5,000 ly on mount, up to 50k
  useEffect(() => {
    fetch('/api/stars/nearby?ly=5000&limit=50000')
      .then((r) => r.json())
      .then((data: Star[]) => setStars(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Task 6.1: convert to BufferGeometry Float32Arrays
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    stars.forEach((star, i) => {
      positions[i * 3]     = star.x * PC_TO_LY;
      positions[i * 3 + 1] = star.y * PC_TO_LY;
      positions[i * 3 + 2] = star.z * PC_TO_LY;
      const col = spectralColor(star.spectral_type);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });
    return { positions, colors };
  }, [stars]);

  // Task 8.1/8.2: Zone 2 opacity — fades in 200→500 ly, full 500–5k ly, fades out 5k–8k ly
  useFrame(({ camera }) => {
    if (!matRef.current) return;
    const dist = camera.position.length();
    matRef.current.opacity =
      smoothstep(200, 500, dist) * (1 - smoothstep(5_000, 8_000, dist));
  });

  // Task 6.3: famous stars retain click targets via invisible overlay meshes
  const famousStars = useMemo(() => stars.filter((s) => s.is_famous), [stars]);

  return (
    <>
      {/* Task 14.3: skeleton indicator while Zone 2 loads */}
      {loading && (
        <Html center>
          <div
            style={{
              color: '#1e293b',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Loading Orion Arm…
          </div>
        </Html>
      )}

      {stars.length > 0 && (
      <>
      {/* Task 6.2: single Points object with vertex colors */}
      {/* Task 6.3: raycasting disabled on the point cloud itself */}
      <points raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          size={1.5}
          vertexColors
          transparent
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>

      {/* Task 6.3: invisible click-target spheres for famous stars */}
      {famousStars.map((star) => (
        <mesh
          key={star.id}
          position={starPos(star).toArray()}
          onClick={(e) => { e.stopPropagation(); setOrigin(star); }}
          onContextMenu={(e) => { e.stopPropagation(); setDestination(star); }}
        >
          <sphereGeometry args={[3, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Zone3Galaxy — procedural Milky Way (tasks 7.1–7.5)
// ---------------------------------------------------------------------------

function Zone3Galaxy() {
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Task 7.1/7.2: generate galaxy once at mount
  const galaxy = useMemo(() => generateGalaxy(), []);

  // Task 8.1/8.2: Zone 3 opacity — fades in 4k–8k ly, full above 8k ly
  useFrame(({ camera }) => {
    if (!matRef.current) return;
    const dist = camera.position.length();
    matRef.current.opacity = smoothstep(4_000, 8_000, dist);
  });

  // Task 7.4: Sagittarius A* at galactic center (world coords = -SUN_GALACTIC_X from Sun)
  const sgrAPos: [number, number, number] = [-SUN_GALACTIC_X, 0, 0];
  // Task 7.5: "You are here" = Sun = world origin
  const sunPos: [number, number, number] = [0, 0, 0];

  return (
    <>
      {/* Task 7.3: galaxy BufferGeometry Points */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[galaxy.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[galaxy.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          size={1}
          vertexColors
          transparent
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>

      {/* Task 7.4: Sagittarius A* marker */}
      <mesh position={sgrAPos}>
        <sphereGeometry args={[80, 8, 8]} />
        <meshBasicMaterial color="#ff9900" />
      </mesh>
      <Html position={sgrAPos} distanceFactor={8_000}>
        <div
          style={{
            color: '#ffbb44',
            background: 'rgba(15,23,42,0.75)',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '11px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Sgr A* · Galactic Center
        </div>
      </Html>

      {/* Task 7.5: "You are here" solar system marker */}
      <mesh position={sunPos}>
        <sphereGeometry args={[60, 8, 8]} />
        <meshBasicMaterial color="#ffe066" />
      </mesh>
      <Html position={sunPos} distanceFactor={8_000}>
        <div
          style={{
            color: '#a0c8ff',
            background: 'rgba(15,23,42,0.75)',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '11px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ☀ You are here
        </div>
      </Html>
    </>
  );
}

// ---------------------------------------------------------------------------
// ZoneSelectorOverlay — top-left overlay for choosing star density
// ---------------------------------------------------------------------------

interface ZoneSelectorOverlayProps {
  activeTier: ZoneTier;
  onSelect: (tier: ZoneTier) => void;
  showRings: boolean;
  onToggleRings: () => void;
}

function ZoneSelectorOverlay({ activeTier, onSelect, showRings, onToggleRings }: ZoneSelectorOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        gap: 4,
        zIndex: 10,
      }}
    >
      {ZONE_TIERS.map(({ tier, label }) => {
        const active = tier === activeTier;
        return (
          <button
            key={tier}
            onClick={() => onSelect(tier)}
            style={{
              background: active ? 'rgba(248,250,252,0.15)' : 'rgba(15,23,42,0.82)',
              border: `1px solid ${active ? '#94a3b8' : '#334155'}`,
              color: active ? '#f8fafc' : '#64748b',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: active ? 'default' : 'pointer',
              fontSize: '11px',
              letterSpacing: '0.03em',
              transition: 'color 0.15s, border-color 0.15s, background 0.15s',
            }}
          >
            {label}
          </button>
        );
      })}

      {/* Task 5.2: Rings toggle button */}
      <div style={{ width: 1, background: '#1e293b', margin: '2px 2px' }} />
      <button
        onClick={onToggleRings}
        style={{
          background: showRings ? 'rgba(248,250,252,0.15)' : 'rgba(15,23,42,0.82)',
          border: `1px solid ${showRings ? '#94a3b8' : '#334155'}`,
          color: showRings ? '#f8fafc' : '#64748b',
          padding: '6px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          letterSpacing: '0.03em',
          transition: 'color 0.15s, border-color 0.15s, background 0.15s',
        }}
      >
        Rings
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CameraTweenController — smoothly lerps camera to a target (tasks 8.3, 8.4)
// ---------------------------------------------------------------------------

function CameraTweenController({
  tweenTargetRef,
}: {
  tweenTargetRef: React.MutableRefObject<TweenTarget | null>;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as
    | { target: THREE.Vector3; update: () => void }
    | null);

  useFrame((_, delta) => {
    const tgt = tweenTargetRef.current;
    if (!tgt) return;

    // Exponential ease: smooth but frame-rate independent
    const factor = 1 - Math.exp(-6 * delta);
    camera.position.lerp(tgt.pos, factor);

    if (controls?.target) {
      controls.target.lerp(tgt.orbitTarget, factor);
      controls.update();
    }

    // Clear when close enough
    if (camera.position.distanceTo(tgt.pos) < 0.08) {
      tweenTargetRef.current = null;
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
// TrajectoryVisualization — tasks 9.1–9.3
// ---------------------------------------------------------------------------

function TrajectoryVisualization() {
  const { origin, destination, keyframes, playhead, results } = useSimStore();

  if (!origin || !destination) return null;

  const originPos = starPos(origin);
  const destPos = starPos(destination);

  const fraction =
    results && keyframes.length > 0 && results.totalDistance > 0
      ? keyframes[playhead.index].x / results.totalDistance
      : 0;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const shipPos = new THREE.Vector3().lerpVectors(originPos, destPos, clampedFraction);

  const midPos = new THREE.Vector3().lerpVectors(originPos, destPos, 0.5);
  const distLy =
    Math.sqrt(
      (destination.x - origin.x) ** 2 +
        (destination.y - origin.y) ** 2 +
        (destination.z - origin.z) ** 2,
    ) * PC_TO_LY;

  return (
    <>
      <Line
        points={[originPos, destPos]}
        color="#60a5fa"
        lineWidth={1.5}
        transparent
        opacity={0.65}
      />

      <mesh position={shipPos}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      <Html position={midPos} distanceFactor={20}>
        <div
          style={{
            color: '#93c5fd',
            background: 'rgba(15,23,42,0.75)',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '11px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Distance: {distLy.toFixed(2)} ly
        </div>
      </Html>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene — content inside the Canvas
// ---------------------------------------------------------------------------

interface SceneProps {
  stars: Star[];
  tweenTargetRef: React.MutableRefObject<TweenTarget | null>;
  showRings: boolean;
}

function Scene({ stars, tweenTargetRef, showRings }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#FFF8E0" decay={0} />

      {/* Task 8.5: minDistance / maxDistance */}
      <OrbitControls
        makeDefault
        minDistance={0.01}
        maxDistance={150_000}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Camera tween controller (tasks 8.3, 8.4) */}
      <CameraTweenController tweenTargetRef={tweenTargetRef} />

      {/* Zone 1: stellar neighborhood (tasks 5.x) */}
      <Zone1Stars stars={stars} tweenTargetRef={tweenTargetRef} />

      {/* Task 5.3: distance-shell rings for famous stars */}
      {showRings && <DistanceRings stars={stars} />}

      {/* Zone 2: Orion Arm dense point cloud (tasks 6.x) */}
      <Zone2Stars />

      {/* Zone 3: procedural Milky Way galaxy (tasks 7.x) */}
      <Zone3Galaxy />

      {/* Trajectory + ship icon (tasks 9.x) */}
      <TrajectoryVisualization />

      {/* Task 14.1: bloom/glow post-processing for stars and trajectory line */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// StarMap3D — exported component
// ---------------------------------------------------------------------------

export function StarMap3D() {
  const [stars, setStars] = useState<Star[]>([]);
  const [activeTier, setActiveTier] = useState<ZoneTier>('famous');
  // Cache fetched results per tier so switching back doesn't re-fetch
  const tierCacheRef = useRef<Map<ZoneTier, Star[]>>(new Map());
  // Task 14.3: skeleton while Zone 1 is loading
  const [zone1Loading, setZone1Loading] = useState(true);
  // Task 5.1: toggle for distance-shell rings
  const [showRings, setShowRings] = useState(true);
  // Shared mutable ref for camera tween target; written by button/double-click,
  // consumed by CameraTweenController in useFrame.
  const tweenTargetRef = useRef<TweenTarget | null>(null);

  // Initial load: Famous tier only
  useEffect(() => {
    fetch(ZONE_TIERS[0].fetchUrl)
      .then((r) => r.json())
      .then((data: Star[]) => {
        tierCacheRef.current.set('famous', data);
        setStars(data);
      })
      .catch(console.error)
      .finally(() => setZone1Loading(false));
  }, []);

  const handleZoneSelect = useCallback((tier: ZoneTier) => {
    if (tier === activeTier) return;
    setActiveTier(tier);
    const cached = tierCacheRef.current.get(tier);
    if (cached) {
      setStars(cached);
      return;
    }
    const config = ZONE_TIERS.find((z) => z.tier === tier)!;
    fetch(config.fetchUrl)
      .then((r) => r.json())
      .then((data: Star[]) => {
        tierCacheRef.current.set(tier, data);
        setStars(data);
      })
      .catch(console.error);
  }, [activeTier]);

  // Task 8.4: reset view → tween camera back to Earth at Zone 1 scale
  const handleResetView = () => {
    tweenTargetRef.current = {
      pos: new THREE.Vector3(0, 5, 30),
      orbitTarget: new THREE.Vector3(0, 0, 0),
    };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Task 14.3: skeleton overlay while Zone 1 data is loading */}
      {zone1Loading && <StarMapSkeleton />}

      {/* Task 14.4: error boundary catches WebGL / R3F render errors */}
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 5, 30], fov: 60, near: 0.001, far: 200_000 }}
          gl={{ antialias: true }}
          style={{ background: '#00000a' }}
        >
          <Scene stars={stars} tweenTargetRef={tweenTargetRef} showRings={showRings} />
        </Canvas>
      </CanvasErrorBoundary>

      {/* Zone selector overlay — top-left */}
      <ZoneSelectorOverlay
        activeTier={activeTier}
        onSelect={handleZoneSelect}
        showRings={showRings}
        onToggleRings={() => setShowRings((v) => !v)}
      />

      {/* Task 8.4: Reset View button overlay */}
      <button
        onClick={handleResetView}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(15,23,42,0.82)',
          border: '1px solid #334155',
          color: '#94a3b8',
          padding: '6px 14px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          letterSpacing: '0.03em',
        }}
      >
        Reset View
      </button>
    </div>
  );
}
