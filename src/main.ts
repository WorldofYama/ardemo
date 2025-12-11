
// src/main.ts
import * as THREE from 'three';
import { THREEx } from '@ar-js-org/ar.js-threejs';

// ===== Three.js 基本セットアップ =====
const scene = new THREE.Scene();
const camera = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
document.body.appendChild(renderer.domElement);

// ===== Webカメラ入力 =====
const arSource = new THREEx.ArToolkitSource({ sourceType: 'webcam' });
function onResize(){
  arSource.onResizeElement();
  arSource.copyElementSizeTo(renderer.domElement);
  // @ts-ignore (arContext is defined later)
  if (arContext && arContext.arController) {
    // @ts-ignore
    arSource.copyElementSizeTo(arContext.arController.canvas);
  }
}
arSource.init(() => onResize());
window.addEventListener('resize', onResize);

// ===== 検出コンテキスト =====
const arContext = new THREEx.ArToolkitContext({
  cameraParametersUrl: './libs/data/camera_para.dat', // ここは同じ場所に置いてOK
  detectionMode: 'mono',
});
arContext.init(() => {
  camera.projectionMatrix.copy(arContext.getProjectionMatrix());
});

// ===== マーカー（hiro） =====
const markerRoot = new THREE.Group();
scene.add(markerRoot);
new THREEx.ArMarkerControls(arContext, markerRoot, {
  type: 'pattern',
  patternUrl: './assets/patt.hiro', // ここも同じ場所に置いてOK
});

// ===== 表示オブジェクト（三角錐） =====
const geometry = new THREE.ConeGeometry(0.5, 1, 4);
const material = new THREE.MeshNormalMaterial();
const cone = new THREE.Mesh(geometry, material);
cone.position.y = 0.5;
markerRoot.add(cone);

// ===== ループ =====
(function animate(){
  requestAnimationFrame(animate);
  if (arSource.ready) arContext.update(arSource.domElement);
  cone.rotation.y += 0.01;
  renderer.render(scene, camera);
})();
