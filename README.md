# vscode-image-import README
基本的に10秒おきに指定フォルダ内の画像ファイルが差し変わります。

## 開発の流れ
- ターミナル: `npm install`
- ターミナル: `npm run watch`
- `F5` キー押下でデバッグ実行
- 別ウィンドウでVSCodeが起動されるため、以下のコマンドを実行して動き確認する
  - `Panel View My Love Cat`: テキストエディタにパネルを追加して画像を表示する
  - `Explorer View My Love Cat`: エクスプローラーに画像を表示する
  - `View My Love Cat Random Update`: 表示中の画像をランダムに変更する

## 技術
 - Webview

## 構成
src/extension.ts: ユーザー操作に応じた制御
src/MyLoveCatViewPanel.ts: 表示パネルのロジック
src/MyLoveCatViewProvider.ts: データ提供ロジック
src/utils.ts: 共通のユーティリティ関数
src/services/LocalImageService.ts: 特定フォルダから画像を取得する
src/services/GooglePhotosService.ts: Google Photos APIから画像を取得する

###  バージョン
node v20以上
nodebrew use v20.10.0

asdf install nodejs 16.20.2
asdf list
asdf local nodejs 20.11.0
npm install
