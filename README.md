# AR Demo (Edge + GitHub Pages, No CDN)

このリポジトリは **外部CDNを使わず**、GitHub Pages 上で **hiro マーカー**を認識して **三角錐**を表示する最小構成のひな形です。

> ⚠️ 現在はライブラリ・パターン・カメラパラメータが **ダミー** です。動作させるには、以下のファイルを **実ファイルに置き換えて**ください。

## 置き換えが必要なファイル
- `libs/three.min.js` → three.js の minified ビルド
- `libs/ar.js` → AR.js (three.js 版) のビルド
- `libs/data/camera_para.dat` → 実際のカメラパラメータファイル
- `assets/patt.hiro` → Hiro パターンファイル（AR.js 公式）
- `assets/markers/HIRO.jpg` → 印刷用 Hiro 画像（任意、現状はダミー画像）

## ファイル構成
```
.
├─ index.html
├─ .nojekyll
├─ libs/
│  ├─ three.min.js            # 置換必須
│  ├─ ar.js                   # 置換必須（THREEx.* を含む）
│  └─ data/
│     └─ camera_para.dat      # 置換必須
├─ assets/
│  ├─ patt.hiro               # 置換必須
│  └─ markers/
│     └─ HIRO.jpg             # 印刷用（任意）
└─ README.md
```

## 公開方法（GitHub Pages）
1. この一式をリポジトリ（例: `ardemo`）のルートに配置
2. GitHub の **Settings → Pages** で `main` / `/ (root)` を選択
3. 公開 URL 例: `https://<username>.github.io/ardemo/`
4. Edge でアクセス → カメラ許可 → hiro マーカーを映す

## 動かないときのチェック
- `index.html` の相対パスが正しいか
- `camera_para.dat` / `patt.hiro` に 404 が出ていないか
- Edge/OS のカメラ権限が許可されているか
- 環境が HTTPS で提供されているか（GitHub Pages は HTTPS）

## メモ
- `.nojekyll` により Jekyll の処理を無効化しています（生のファイルを配信）。
- 企業ポリシーで外部スクリプトが禁止される場合でも、このひな形は **ローカル参照のみ**で動作します（実ファイルに置換後）。
