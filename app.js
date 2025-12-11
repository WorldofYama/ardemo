
/* =======================================================================
 * app.js — 完全版ガード & 最小初期化（hiro + 三角錐）
 * 目的：
 *  - THREE / THREEx のグローバル存在チェック
 *  - 読み込み順・パス誤り・モジュール版混在の切り分け
 *  - camera_para.dat / patt.hiro の取得確認
 *  - 成功時は最小の AR 表示（回転する三角錐）
 * ======================================================================= */

(function(){
  const TAG = '[ardemo]';
  const PATHS = {
    three: './libs/three.min.js',       // 物理ファイルの想定パス（Network確認用）
    arjs:  './libs/ar.js',
    camera: './libs/data/camera_para.dat',
    pattern: './assets/patt.hiro'
  };

  // ---- 0) 便利ログ関数 ---------------------------------------------------
  function info(msg, obj){ console.info(`${TAG} ${msg}`, obj ?? ''); }
  function warn(msg, obj){ console.warn(`${TAG} ${msg}`, obj ?? ''); }
  function error(msg, obj){ console.error(`${TAG} ${msg}`, obj ?? ''); }

  console.log('app.js loaded (temporary)');

  // ---- 1) スクリプト読み込みの静的検査（Elements側での確認補助）---------
  // 直列読みであれば HTML に以下 3 タグが存在するはず
  // ./libs/three.min.js</script>
  // ./libs/ar.js</script>
  // ./app.js</script>
  (function checkScriptOrder(){
    const scripts = Array.from(document.querySelectorAll('script[src]'))
                          .map(s => s.getAttribute('src'));
    info('scriptタグ列挙', scripts);
    const idxThree = scripts.indexOf(PATHS.three);
    const idxArjs  = scripts.indexOf(PATHS.arjs);
    const idxApp   = scripts.indexOf('./app.js');
    if (idxThree === -1) warn('HTMLに three.min.js の <script> が見当たりません', PATHS.three);
    if (idxArjs  === -1) warn('HTMLに ar.js の <script> が見当たりません', PATHS.arjs);
    if (idxApp   === -1) warn('HTMLに app.js の <script> が見当たりません（ファイル名が違う？）');
    if (idxThree !== -1 && idxArjs !== -1 && idxApp !== -1){
      if (!(idxThree < idxArjs && idxArjs < idxApp)){
        warn('script読み込み順が推奨順（三→AR.js→app）になっていません', {idxThree, idxArjs, idxApp});
      } else {
        info('script読み込み順はOK（三→AR.js→app）');
      }
    }
  })();

  // ---- 2) グローバル存在チェック -----------------------------------------
  const hasTHREE  = typeof window.THREE  !== 'undefined';
  const hasTHREEx = typeof window.THREEx !== 'undefined';

  if (!hasTHREE){
    error('THREE が未定義です。以下を確認してください：\n' +
      ' - three.min.js を UMD/IIFE 版で読み込んでいるか（type="module" は不可）\n' +
      ` - ${PATHS.three} が Network で 200 か\n` +
      ' - app.js より前に three.min.js を読み込んでいるか');
    // ここで終了：three がなければ先へ進めない
    return;
  } else {
    info('THREE の存在を確認', {version: THREE.REVISION});
  }

  if (!hasTHREEx){
    error('THREEx が未定義です。AR.js の three版（THREEx.* 内包）を読み込んでいるか確認してください。\n' +
      ` - ${PATHS.arjs} が Network で 200 か\n` +
      ' - three.min.js の後に ar.js を読み込んでいるか');
    // ここで終了：AR.js three版が無いと先へ進めない
    return;
  } else {
    info('THREEx の存在を確認');
  }

  // ---- 3) 重要アセットの事前フェッチ（パス誤り切り分け）-----------------
  // fetch で HEAD/GET を行い、200 であることを確認します。
  async function checkAsset(url, label){
    try {
      const res = await fetch(url, {method: 'HEAD', cache: 'no-store'});
      if (!res.ok){
        error(`${label} の取得に失敗（HTTP ${res.status}）`, url);
        return false;
      }
      info(`${label} を確認（HTTP 200）`, url);
      return true;
    } catch(e){
      error(`${label} の取得中に例外`, {url, e});
      return false;
    }
  }

  // ---- 4) 画面サイズ・リサイズ連携 ---------------------------------------
  function setupResize(arSource, renderer, arContext){
    function onResize(){
      arSource.onResizeElement();
      arSource.copyElementSizeTo(renderer.domElement);
      if (arContext && arContext.arController){
        arSource.copyElementSizeTo(arContext.arController.canvas);
      }
    }
    window.addEventListener('resize', onResize);
    return onResize;
  }

  // ---- 5) 初期化本体（最小AR表示）----------------------------------------
  async function init(){
    // 重要アセットの事前チェック
    const okCamera  = await checkAsset(PATHS.camera,  'camera_para.dat');
    const okPattern = await checkAsset(PATHS.pattern, 'patt.hiro');
    if (!okCamera || !okPattern){
      error('必須アセットが 200 ではありません。パス/配置を修正して再読み込みしてください。');
      return;
    }

    // Three.js ベースの基本セットアップ
    const scene  = new THREE.Scene();
    const camera = new THREE.Camera();
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // 透明背景
    document.body.appendChild(renderer.domElement);

    // 映像ソース（Webcam）
    const arSource = new THREEx.ArToolkitSource({sourceType: 'webcam'});
    await new Promise((resolve) => {
      arSource.init(() => {
        info('ArToolkitSource 初期化完了');
        resolve();
      });
    });

    // リサイズ連携
    const onResize = setupResize(arSource, renderer, null);
    // 初期リサイズ（少し遅延させると安定）
    setTimeout(onResize, 300);

    // ARコンテキスト
    const arContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: PATHS.camera,
      detectionMode: 'mono'
    });

    await new Promise((resolve) => {
      arContext.init(() => {
        info('ArToolkitContext 初期化完了（投影行列をカメラへ反映）');
        camera.projectionMatrix.copy(arContext.getProjectionMatrix());
        resolve();
      });
    });

    // リサイズ連携に arContext を差し込む（controllerのcanvasにもサイズ同期）
    window.removeEventListener('resize', onResize);
    const onResize2 = setupResize(arSource, renderer, arContext);
    setTimeout(onResize2, 300);

    // マーカーRoot
    const markerRoot = new THREE.Group();
    scene.add(markerRoot);

    const markerControls = new THREEx.ArMarkerControls(arContext, markerRoot, {
      type: 'pattern',
      patternUrl: PATHS.pattern
    });

    // ジオメトリ（回転する三角錐）
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1, 2, 4),
      new THREE.MeshNormalMaterial()
    );
    cone.position.y = 1.0; // 垂直方向に少し持ち上げ（地面に埋もれないように）
    markerRoot.add(cone);

    // ループ
    function animate(){
      requestAnimationFrame(animate);
      if (arSource.ready === false) return;
      arContext.update(arSource.domElement);
      cone.rotation.y += 0.02;
      renderer.render(scene, camera);
    }
    animate();

    info('初期化完了：HIRO マーカーをカメラに映すと三角錐が表示されます');
  }

  // ---- 6) 実行（失敗時は詳細ログを吐いて停止）----------------------------
  init().catch(e => {
    error('初期化中にエラーが発生しました', e);
  });

