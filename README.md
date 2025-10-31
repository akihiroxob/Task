# デスクトップ Todo & Sticky Notes アプリ

TypeScript と Electron で実装したデスクトップアプリです。縦並びの Todo リストと、自由に配置できる付箋メモを同じ画面で管理できます。

## 主な機能

- Todo リスト
  - タスクの追加 / 完了状態の切り替え / 削除
  - 未完了・完了済みのフィルタリング
- 付箋メモ
  - テキストと色を指定してメモを追加
  - ドラッグ&ドロップで自由に配置
  - 個別削除
  - メモを直接編集可能
- Todo / メモはローカルストレージに自動保存（再起動後も復元）

## セットアップ

```bash
npm install
```

## 開発サイクル

```bash
npm run start
```

`npm run start` は TypeScript をビルドした後、Electron を起動します。開発時に自動リロードが必要な場合は、任意で `tsc --watch` を別ターミナルで起動してから Electron を手動で再起動してください。

## ビルド出力

```
/ dist
  ├─ main.js      // メインプロセス
  ├─ preload.js   // Preload スクリプト
  ├─ renderer.js  // レンダラープロセス（Todo & 付箋 UI）
  ├─ index.html   // UI テンプレート
  └─ styles.css   // UI スタイル
```

## 注意事項

- `electron` と `@types/node` は開発用依存関係として package.json に定義しています。必要に応じてバージョンを調整してください。
- ブラウザの `localStorage` を利用して端末内にデータを保存します。`localStorage` をクリアした場合は Todo やメモが初期化されます。
