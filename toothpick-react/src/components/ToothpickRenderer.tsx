import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import type { ToothpickPosition } from '../types';

// Check if WebGL is supported
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    console.error('WebGL check failed:', e);
    return false;
  }
}

// Optimized instanced toothpicks component
function InstancedToothpicks({ toothpicks }: { toothpicks: ToothpickPosition[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorPickerMode = useStore(state => state.colorPickerMode);
  const setHoveredToothpick = useStore(state => state.setHoveredToothpick);
  const setSelectedToothpick = useStore(state => state.setSelectedToothpick);
  const imageWidth = useStore(state => state.imageWidth);
  const imageHeight = useStore(state => state.imageHeight);
  // count derived from props when needed
  
  // No manual color buffer; we'll use setColorAt exclusively
  
  // Create geometry based on mode
  const geometry = useMemo(() => {
    if (colorPickerMode) {
      // Use sphere for dots in color picker mode
      return new THREE.SphereGeometry(5, 16, 16);
    } else {
      // Use cylinder for toothpicks
      return new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
    }
  }, [colorPickerMode]);
  
  // Simple material using per-instance colors
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false, toneMapped: false });
  }, []);
  
  // Update instance matrices and colors
  useEffect(() => {
    if (!meshRef.current || toothpicks.length === 0) return;
    
    const mesh = meshRef.current;
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    // Ensure instanceColor attribute exists before setColorAt (older versions)
    if (!mesh.instanceColor) {
      const init = new Float32Array(toothpicks.length * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(init, 3);
    }
    
    toothpicks.forEach((toothpick, i) => {
      // Position - center the toothpicks
      tempObject.position.set(
        toothpick.x - imageWidth / 2,
        toothpick.z,
        -(toothpick.y - imageHeight / 2)
      );
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
      
      tempColor
        .setRGB(
          toothpick.color[0] / 255,
          toothpick.color[1] / 255,
          toothpick.color[2] / 255
        )
        .convertSRGBToLinear();
      mesh.setColorAt(i, tempColor);
    });
    
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (mesh.material && 'needsUpdate' in mesh.material) {
      (mesh.material as THREE.Material).needsUpdate = true;
    }
  }, [toothpicks, imageWidth, imageHeight]);
  
  // Raycasting for hover/click
  const { raycaster, mouse, camera } = useThree();
  
  useFrame(({ gl }) => {
    if (!meshRef.current || !colorPickerMode) return;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshRef.current);
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId < toothpicks.length) {
        setHoveredToothpick(toothpicks[instanceId]);
        gl.domElement.style.cursor = 'pointer';
      }
    } else {
      setHoveredToothpick(null);
      gl.domElement.style.cursor = 'auto';
    }
  });
  
  const handleClick = (event: THREE.Event & { instanceId?: number }) => {
    if (!colorPickerMode) return;
    
    const instanceId = event.instanceId;
    if (instanceId !== undefined && instanceId < toothpicks.length) {
      setSelectedToothpick(toothpicks[instanceId]);
    }
  };
  
  return (
    <instancedMesh
      key={toothpicks.length}
      ref={meshRef}
      args={[geometry, material, toothpicks.length]}
      onClick={handleClick}
    />
  );
}

// Cardboard base plane
function BasePlane() {
  const imageWidth = useStore(state => state.imageWidth);
  const imageHeight = useStore(state => state.imageHeight);
  const cardboardColor = useStore(state => state.cardboardColor);
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[imageWidth, imageHeight]} />
      <meshStandardMaterial color={new THREE.Color(...cardboardColor)} />
    </mesh>
  );
}

// Camera controller component
function CameraController() {
  const is2DMode = useStore(state => state.is2DMode);
  const imageWidth = useStore(state => state.imageWidth);
  const imageHeight = useStore(state => state.imageHeight);
  
  const { camera, size } = useThree();
  
  useEffect(() => {
    if (is2DMode) {
      // Switch to orthographic view
      camera.position.set(0, 100, 0);
      camera.lookAt(0, 0, 0);
      
      if (camera instanceof THREE.OrthographicCamera) {
        const aspect = size.width / size.height;
        const frustumSize = Math.max(imageWidth, imageHeight) * 0.6;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
      }
    } else {
      // Perspective view
      camera.position.set(imageWidth * 0.4, imageHeight * 0.3, imageWidth * 0.4);
      camera.lookAt(0, 0, 0);
    }
  }, [is2DMode, camera, imageWidth, imageHeight, size]);
  
  return null;
}

// Main renderer component
export function ToothpickRenderer() {
  const toothpicks = useStore(state => state.toothpicks);
  const backgroundColor = useStore(state => state.backgroundColor);
  const is2DMode = useStore(state => state.is2DMode);
  const colorPickerMode = useStore(state => state.colorPickerMode);
  
  // Check WebGL support
  if (!isWebGLAvailable()) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">WebGL Not Supported</h2>
          <p className="text-gray-600">Your browser doesn't support WebGL, which is required for 3D rendering.</p>
        </div>
      </div>
    );
  }
  
  try {
    return (
      <div className="w-full h-full">
        <Canvas
          className="w-full h-full"
          camera={is2DMode ? undefined : { position: [100, 100, 100], fov: 60 }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <color attach="background" args={backgroundColor} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, 10, -5]} intensity={0.5} />
          
          <CameraController />
          
          <BasePlane />
          
          {toothpicks.length > 0 && (
            <InstancedToothpicks toothpicks={toothpicks} />
          )}
          
          {!is2DMode && !colorPickerMode && (
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              target={[0, 0, 0]}
            />
          )}
          
          {is2DMode && (
            <OrthographicCamera makeDefault position={[0, 100, 0]} />
          )}
        </Canvas>
      </div>
    );
  } catch (error) {
    console.error('ToothpickRenderer error:', error);
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">3D Rendering Error</h2>
          <p className="text-gray-600">Please check the console for details</p>
        </div>
      </div>
    );
  }
}
