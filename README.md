# VSCode Image Import - My Love Cat

VSCodeに猫の画像を表示するための拡張機能です。エディタパネルやエクスプローラービューに猫の画像を表示し、定期的に画像が自動更新されます。

## 機能

- エディタパネルに猫の画像を表示
- エクスプローラービューに猫の画像を表示
- 設定した間隔（デフォルト10秒）で画像が自動的に切り替わる
- 手動での画像更新
- ローカルフォルダの画像表示
- Google Photosのアルバムから画像を取得して表示

## 使用方法

拡張機能をインストール後、以下のコマンドを使用できます：

- `MyLoveCat: Panel View` - エディタパネルに猫の画像を表示
- `MyLoveCat: Explorer View` - エクスプローラービューに猫の画像を表示
- `MyLoveCat: Image Random Update` - 表示中の画像をランダムに更新
- `MyLoveCat: クライアント ID とクライアント シークレットの設定` - Google Photos連携のための認証情報を設定

エクスプローラービューの「My Love Cat」セクションにも画像が表示されます。

## 設定項目

この拡張機能は以下の設定項目をサポートしています：

- `vscode-image-import.imagePath`: 最愛の猫画像が含まれているフォルダを指定（未指定の場合は内部保存画像を利用）
- `vscode-image-import.intervalSeconds`: ランダム表示の更新間隔（秒）、デフォルトは10秒
- `vscode-image-import.isGooglePhoto`: Google フォトから画像を取得するかどうか（false の場合は内部保存画像を利用）
- `vscode-image-import.googlePhotoAlbumTitle`: Google フォトから取得するアルバムのタイトル（デフォルト: "茶々と長政"）

## Google Photos連携の設定

Google Photosから画像を取得するには、以下の手順で設定します：

1. `MyLoveCat: クライアント ID とクライアント シークレットの設定` コマンドを実行
2. Google Cloud Platformで取得したクライアントIDとクライアントシークレットを入力
3. 認証プロセスを完了
4. 表示されるアルバム一覧から使用するアルバムを選択

設定後、`vscode-image-import.isGooglePhoto` を `true` に設定することで、Google Photosからの画像取得が有効になります。

## 開発方法

### 環境準備

- Node.js v20以上が必要です
  ```
  nodebrew use v20.10.0
  ```
  または
  ```
  asdf local nodejs 20.11.0
  ```

### 開発の流れ

1. 依存パッケージのインストール
   ```
   npm install
   ```

2. 開発モードでの実行
   ```
   npm run watch
   ```

3. デバッグ実行
   - `F5` キーを押してデバッグ実行
   - 別ウィンドウでVSCodeが起動
   - コマンドパレットから以下のコマンドを実行して動作確認
     - `MyLoveCat: Panel View` - エディタパネルに画像表示
     - `MyLoveCat: Explorer View` - エクスプローラーに画像表示
     - `MyLoveCat: Image Random Update` - 表示中の画像をランダムに更新

## プロジェクト構成

- `src/extension.ts`: 拡張機能のエントリーポイント、ユーザー操作に応じた制御
- `src/MyLoveCatViewPanel.ts`: エディタパネルに表示するためのクラス
- `src/MyLoveCatViewProvider.ts`: エクスプローラーに表示するためのクラス
- `src/common/ViewBase.ts`: 共通機能を提供する基底クラス
- `src/utils.ts`: 共通のユーティリティ関数
- `src/services/authService.ts`: Google認証関連の処理
- `src/services/googlePhotosService.ts`: Google Photos APIとの連携処理
- `src/secretPanel.ts`: クライアントIDとシークレットを入力するパネル
- `src/selectAlbumPanel.ts`: アルバム選択用パネル

## 使用技術

- VSCode Webview API
- Google Photos API
- TypeScript
