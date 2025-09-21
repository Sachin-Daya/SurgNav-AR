import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FLAGS, CASES, MARKER } from "./config";
import { buildHUD } from "./ui/hud";
import { computeAngleErrorDeg, distance3D } from "./scoring/metrics";
import { runSegmentationIfEnabled } from "./ml/onnx-seg";

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene + camera
const scene = new THREE.Scene();
const camera = new THREE.Camera();
scene.add(camera);

// Light
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(1,1,1); scene.add(dir);

// AR.js
// @ts-ignore
const arToolkitSource = new THREEx.ArToolkitSource({ sourceType: "webcam" });
arToolkitSource.init(()=> onResize());
window.addEventListener("resize", onResize);
function onResize(){
  arToolkitSource.onResizeElement();
  arToolkitSource.copyElementSizeTo(renderer.domElement);
  if (arToolkitContext && arToolkitContext.arController !== null) {
    arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
  }
}
// @ts-ignore
const arToolkitContext = new THREEx.ArToolkitContext({
  cameraParametersUrl: MARKER.cameraParamsUrl,
  detectionMode: "mono"
});
arToolkitContext.init(()=> { camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix()); });

const markerGroup = new THREE.Group(); scene.add(markerGroup);
// @ts-ignore
const markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerGroup, { type:"pattern", patternUrl: MARKER.patternUrl });

// Case + model
let currentCase = CASES[0];
let modelRoot: THREE.Object3D | null = null;

// Entry/Target markers
const sphGeo = new THREE.SphereGeometry(0.006, 16, 16);
const entryMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4 });
const targetMat = new THREE.MeshStandardMaterial({ color: 0xff4081 });
const entryMarker = new THREE.Mesh(sphGeo, entryMat); entryMarker.visible=false; markerGroup.add(entryMarker);
const targetMarker = new THREE.Mesh(sphGeo, targetMat); targetMarker.visible=false; markerGroup.add(targetMarker);

// Trajectory
const trajMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
const trajGeom = new THREE.BufferGeometry();
const trajLine = new THREE.Line(trajGeom, trajMat); trajLine.visible=false; markerGroup.add(trajLine);

// HUD
const hud = buildHUD({
  onCaseChange: (id)=> loadCase(id),
  onReset: resetSession,
  onToggleML: (v)=>{ (FLAGS as any).mlEnabled = v; }
});

// Load initial
await loadCase(currentCase.id);

// Raycast tap
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let placing: "entry" | "target" = "entry";
renderer.domElement.addEventListener("pointerdown", (ev)=>{
  pointer.x = (ev.clientX / renderer.domElement.clientWidth) * 2 - 1;
  pointer.y = -(ev.clientY / renderer.domElement.clientHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(markerGroup, true);
  if (!intersects.length) return;
  const hit = intersects[0];
  const p = hit.point;
  if (placing === "entry"){
    entryMarker.position.copy(p); entryMarker.visible=true; placing = "target"; trajLine.visible=false;
  } else {
    targetMarker.position.copy(p); targetMarker.visible=true; placing = "entry"; updateTrajectory();
  }
});

function updateTrajectory(){
  if (!entryMarker.visible || !targetMarker.visible) return;
  const pts = [entryMarker.position, targetMarker.position];
  const arr = new Float32Array(pts.length*3);
  pts.forEach((v,i)=>{ arr[i*3+0]=v.x; arr[i*3+1]=v.y; arr[i*3+2]=v.z; });
  trajGeom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  trajGeom.computeBoundingSphere();
  trajLine.visible = true;

  const ideal = new THREE.Vector3(0,0,-1);
  const dirV = new THREE.Vector3().subVectors(targetMarker.position, entryMarker.position).normalize();
  const angleDeg = computeAngleErrorDeg(dirV, ideal);
  const color = angleDeg < 5 ? 0x00ff66 : angleDeg < 12 ? 0xffcc33 : 0xff3355;
  (trajLine.material as THREE.LineBasicMaterial).color.setHex(color);

  const depthMm = distance3D(entryMarker.position, targetMarker.position) * 1000;
  hud.setMetrics({ angleDeg, depth: depthMm, entrySet:true, targetSet:true });
}

async function loadCase(id:string){
  const found = CASES.find(c=>c.id===id) || CASES[0];
  currentCase = found;

  if (modelRoot){ markerGroup.remove(modelRoot); modelRoot = null; }

  // load model
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(found.glb);
    modelRoot = gltf.scene;
  } catch (e){
    console.warn("GLB not found, using placeholder sphere");
    modelRoot = new THREE.Mesh(new THREE.SphereGeometry(0.08,48,48), new THREE.MeshStandardMaterial({color:0x888888}));
  }

  // metadata scale (mm->m)
  try {
    const meta = await (await fetch(found.meta)).json();
    if (meta.scale) modelRoot!.scale.setScalar(meta.scale);
  } catch {}

  markerGroup.add(modelRoot!);
  resetSession();

  if (FLAGS.mlEnabled){ runSegmentationIfEnabled(currentCase).catch(console.warn); }
}

function resetSession(){
  entryMarker.visible=false; targetMarker.visible=false; trajLine.visible=false; placing = "entry";
  hud.setMetrics({ angleDeg:null, depth:null, entrySet:false, targetSet:false });
}

function animate(){
  requestAnimationFrame(animate);
  // @ts-ignore
  if (arToolkitSource.ready !== false) arToolkitContext.update(arToolkitSource.domElement);
  renderer.render(scene, camera);
}
animate();

(Object.assign(window as any, { THREE, scene, markerGroup }));
