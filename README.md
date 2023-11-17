# vscode-image-import README
基本的に10秒おきに指定フォルダ内の画像ファイルがが差し変わります。

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