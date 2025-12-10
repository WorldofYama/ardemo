
(function () {
  'use strict';

  // 必須チェック
  if (!window.AFRAME) {
    console.error('[aframe-ar] A-Frame が読み込まれていません');
    return;
  }
  const hasThreeAR =
    window.THREEx &&
    THREEx.ArToolkitSource &&
    THREEx.ArToolkitContext &&
    THREEx.ArMarkerControls;

  if (!hasThreeAR) {
    console.error('[aframe-ar] THREEx.* (AR.js Three版コア) が見つかりません');
    return;
  }

  /** -------------------------
   * A-Frame System: arjs
   * シーン全体の AR 初期化（ソース・コンテキスト・リサイズ処理）
   * ------------------------- */
  AFRAME.registerSystem('arjs', {
    schema: {
      sourceType: { default: 'webcam' },           // 'webcam' / 'image' など
      detectionMode: { default: 'mono_and_matrix' }, // 'mono' / 'mono_and_matrix'
      patternRatio: { default: 0.5 },               // マーカー黒枠と内部パターン比
      debugUIEnabled: { default: false }
    },

    init: function () {
      const sceneEl = this.sceneEl;
      const data = this.data;

      // A-Frame の renderer/camera は scene loaded 後に確実化
      const ready = () => {
        this.renderer = sceneEl.renderer;
        this.camera = sceneEl.camera;

        // ソース（webcam）
        this.arToolkitSource = new THREEx.ArToolkitSource({
          sourceType: data.sourceType
        });

        // サイズの初期化＆リスナー
        const onResize = () => {
          if (!this.arToolkitSource) return;
          this.arToolkitSource.onResizeElement();
          // Three.js の canvas サイズへ
          this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);
          // ARController の canvas サイズへ（ある場合）
          if (this.arToolkitContext && this.arToolkitContext.arController) {
            this.arToolkitSource.copyElementSizeTo(
              this.arToolkitContext.arController.canvas
            );
          }
        };
        this._onResize = onResize;

        this.arToolkitSource.init(() => {
          onResize();
        });
        window.addEventListener('resize', onResize);

        // コンテキスト（カメラパラ・検出モードなど）
        this.arToolkitContext = new THREEx.ArToolkitContext({
          detectionMode: data.detectionMode,
          patternRatio: data.patternRatio
          // cameraParametersUrl の指定が必要ならここに追記（例：'/ardemo/data/camera_para.dat'）
        });

        this.arToolkitContext.init(() => {
          // A-Frame カメラの射影に反映
          this.camera.projectionMatrix.copy(
            this.arToolkitContext.getProjectionMatrix()
          );
          // デバッグUI（必要なら）
          if (data.debugUIEnabled && THREEx.ArToolkitContext.gui) {
            THREEx.ArToolkitContext.gui(this.arToolkitContext);
          }
        });
      };

      if (sceneEl.hasLoaded) ready();
      else sceneEl.addEventListener('loaded', ready);
    },

    tick: function () {
      if (!this.arToolkitSource || !this.arToolkitContext) return;
      if (this.arToolkitSource.ready === false) return;
      // 毎フレーム更新（ビデオ→検出）
      this.arToolkitContext.update(this.arToolkitSource.domElement);
    },

    remove: function () {
      window.removeEventListener('resize', this._onResize || (() => {}));
      if (this.arToolkitSource && this.arToolkitSource.dispose)
        this.arToolkitSource.dispose();
      if (this.arToolkitContext && this.arToolkitContext.dispose)
        this.arToolkitContext.dispose();
    }
  });

  /** -------------------------
   * A-Frame Component: marker
   * 各 <a-marker> に対応するマーカーコントロール
   * ------------------------- */
  AFRAME.registerComponent('marker', {
    schema: {
      // <a-marker type="pattern" url="markers/xxx.patt" size="1.0">
      type: { default: 'pattern' },  // 'pattern' / 'barcode'
      url: { default: '' },          // .patt のURL
      size: { default: 1.0 },        // メートル（1.0 = 1m = 100cm）
      value: { default: 0 }          // barcode の値（barcode時のみ）
    },

    init: function () {
      const system = this.el.sceneEl.systems['arjs'];
      if (!system || !system.arToolkitContext) {
        console.error('[aframe-ar] arjs system が未初期化です');
        return;
      }

      const el = this.el;
      const object3d = el.object3D;
      const data = this.data;

      // THREEx.ArMarkerControls のオプション
      let controlsOpts;
      if (data.type === 'pattern') {
        controlsOpts = {
          type: 'pattern',
          patternUrl: data.url,
          size: data.size
        };
      } else if (data.type === 'barcode') {
        controlsOpts = {
          type: 'barcode',
          barcodeValue: parseInt(data.value || 0, 10),
          size: data.size
        };
      } else {
        console.warn('[aframe-ar] 未対応の marker type:', data.type);
        controlsOpts = { type: 'pattern', patternUrl: data.url, size: data.size };
      }

      // マーカーコントロール生成（A-Frameの object3D を対象に）
      this.markerControls = new THREEx.ArMarkerControls(
        system.arToolkitContext,
        object3d,
        controlsOpts
      );

      // 可視/不可視に合わせてイベント発火
      object3d.visible = false;
      let last = false;
      this._visWatcher = () => {
        const now = object3d.visible === true;
        if (now && !last) {
          el.emit('markerFound');
        } else if (!now && last) {
          el.emit('markerLost');
        }
        last = now;
      };
    },

    tick: function () {
      // マーカー可視状態の監視のみ（検出本体は system.tick）
      if (this._visWatcher) this._visWatcher();
    },

    remove: function () {
      if (this.markerControls && this.markerControls.dispose) {
        this.markerControls.dispose();
      }
      this.markerControls = null;
      this._visWatcher = null;
    }
  });

  /** -------------------------
   * A-Frame Primitive: <a-marker>
   * HTML側の使い勝手を良くするマッピング
   * ------------------------- */
  AFRAME.registerPrimitive('a-marker', {
    defaultComponents: {
      marker: {}
    },
    // <a-marker type="pattern" url="..." size="...">
    mappings: {
      type: 'marker.type',
      url: 'marker.url',
      size: 'marker.size',
      value: 'marker.value'
    }
  });
})();
