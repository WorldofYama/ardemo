
console.log('app.js loaded (temporary)');

// Three.js & AR.jsの初期化例（UMD版用）
var scene = new THREE.Scene();
var camera = new THREE.Camera();
scene.add(camera);

var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var arSource = new THREEx.ArToolkitSource({sourceType: 'webcam'});
arSource.init(function onReady() {
  setTimeout(() => {
    onResize();
  }, 2000);
});
window.addEventListener('resize', onResize);

function onResize() {
  arSource.onResizeElement();
  arSource.copyElementSizeTo(renderer.domElement);
  if (arContext.arController !== null) {
    arSource.copyElementSizeTo(arContext.arController.canvas);
  }
}

var arContext = new THREEx.ArToolkitContext({
  cameraParametersUrl: './libs/data/camera_para.dat',
  detectionMode: 'mono'
});
arContext.init(function onCompleted() {
  camera.projectionMatrix.copy(arContext.getProjectionMatrix());
});

var markerRoot = new THREE.Group();
scene.add(markerRoot);

var arMarkerControls = new THREEx.ArMarkerControls(arContext, markerRoot, {
  type: 'pattern',
  patternUrl: './assets/patt.hiro'
});

// 三角錐オブジェクト
var geometry = new THREE.ConeGeometry(1, 2, 4);
var material = new THREE.MeshNormalMaterial();
var cone = new THREE.Mesh(geometry, material);
markerRoot.add(cone);

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  if (arSource.ready === false) return;
  arContext.update(arSource.domElement);
  cone.rotation.y += 0.01; // 回転
  renderer.render(scene, camera);
}
animate();
