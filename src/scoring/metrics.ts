import * as THREE from "three";
export function computeAngleErrorDeg(vec: THREE.Vector3, ideal: THREE.Vector3){
  const dot = THREE.MathUtils.clamp(vec.dot(ideal), -1, 1);
  return THREE.MathUtils.radToDeg(Math.acos(dot));
}
export function distance3D(a: THREE.Vector3, b: THREE.Vector3){ return a.distanceTo(b); }
