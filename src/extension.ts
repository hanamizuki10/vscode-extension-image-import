import * as vscode from 'vscode';
import { Auth } from 'googleapis';
import open from 'open';
import * as http from 'http';
import { MyLoveCatViewPanel } from './MyLoveCatViewPanel';
import { MyLoveCatViewProvider } from './MyLoveCatViewProvider';
import { createSecretPanel } from './secretPanel';
import { createSelectAlbumPanel } from './selectAlbumPanel';
import {
  authenticate,
  refreshToken,
  getAlbums,
  findAlbumIdByTitle,
  findMediaItem
} from './services/googlePhotosService';
export async function activate(context: vscode.ExtensionContext) {
  //==========================================================================
  // 設定値取得
  //==========================================================================
  const outputCh = vscode.window.createOutputChannel("VScode Image Import");
  outputCh.show();  // 出力チャンネルを表示
  outputCh.appendLine('Congratulations, your extension "vscode-image-import" is now active!');

  const config = vscode.workspace.getConfiguration('vscode-image-import');
  let intervalSeconds = config.get<number>('intervalSeconds', 10);
  let configImagePath = config.get<string>('imagePath', '');
  let isGooglePhoto = config.get<boolean>('isGooglePhoto', false);

  outputCh.appendLine(`intervalSeconds: ${intervalSeconds}`);
  outputCh.appendLine(`configImagePath: ${configImagePath}`);
  outputCh.appendLine(`isGooglePhoto: ${isGooglePhoto}`);
  //==========================================================================
  // explorer に表示
  //==========================================================================
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'viewExplorerMyLoveCat',
      new MyLoveCatViewProvider(context.extensionUri, configImagePath, isGooglePhoto, outputCh))
  );
  //==========================================================================
  // [MyLoveCat: Explorer View] コマンド実行時
  // explorer の表示が隠れていた場合は展開して表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewExplorerMyLoveCat', () => {
      // すでにエクスプローラーには情報を表示しているけど、フォーカスを当てる感じ
      // 隠れていたら展開して表示するしエクスプローラーを閉じていたら開く
      vscode.commands.executeCommand('viewExplorerMyLoveCat.focus');
    })
  );
  //==========================================================================
  // [MyLoveCat: Panel View] コマンド実行時
  // エディタに表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewPanelMyLoveCat', () => {
      MyLoveCatViewPanel.createOrShow(context.extensionUri, configImagePath, isGooglePhoto, outputCh);
    })
  );
  //==========================================================================
  // [MyLoveCat: Image Random Update] コマンド実行時
  // 画像をランダムに差し替え
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewMyLoveCatRandom', () => {
      // 描画されている猫をrandomで描画切り替え
      MyLoveCatViewPanel.randomUpdate();
      MyLoveCatViewProvider.randomUpdate();
    })
  );

  //==========================================================================
  // [MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド実行時
  // 基本は最初の１回のみ実行を想定（もしくは意図的に変更をしたい時のみ）
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.inputSecretData', () => {
      // 「クライアント ID とクライアント シークレットの設定」パネルを開き、秘密情報を保存
      const panel = createSecretPanel(context);
      // パネルが閉じられたことを検知したら再認証を促す
      panel.onDidDispose(async () => {
        await authenticate(outputCh, context);
        // Google Photos から画像一覧を取得
        const albums = await getAlbums(outputCh, context);
        outputCh.appendLine('albums: ' + JSON.stringify(albums));
        const albumTitle = await createSelectAlbumPanel(context, albums);
        outputCh.appendLine('albumTitle: ' + JSON.stringify(albumTitle));
        // ユーザー選択結果を保存
        config.update('googlePhotoAlbumTitle', albumTitle, true);
      }, null, context.subscriptions);
    })
  );
  
  //==========================================================================
  // [MyLoveCat: Image Random Update(From Google)] コマンド実行時
  // Google Photos のアルバム一覧を表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.randomUpdateFromGoogle', async () => {
      const tokens = context.globalState.get('oauthTokens');
      outputCh.appendLine('tokens: ' + JSON.stringify(tokens));
      listAlbumsWithRetry(outputCh, context);
    })
  );
  //==========================================================================
  // 初期設定
  //==========================================================================
  MyLoveCatViewPanel.updateIsGooglePhoto(isGooglePhoto);
  MyLoveCatViewProvider.updateIsGooglePhoto(isGooglePhoto);

  if (isGooglePhoto) {
    // Google Photos から画像を取得
    vscode.commands.executeCommand('vscode-image-import.randomUpdateFromGoogle');
  }
  //==========================================================================
  // 指定数秒おきにランダムに画像を差し替え
  //==========================================================================
  let interval = setInterval(updateRandomDisplay, intervalSeconds * 1000);
  // 拡張機能が非アクティブになった時にタイマーをクリア
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
  //==========================================================================
  // 設定変更時
  // - インターバルを更新
  // - 画像パスを更新
  // - Google フォトから画像を取得するかどうか（false の場合は内部保存画像を利用します）の状態更新
  //==========================================================================
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    const config = vscode.workspace.getConfiguration('vscode-image-import');
    if (e.affectsConfiguration('vscode-image-import.intervalSeconds')) {
      // ランダム表示の更新間隔（秒）に変更あり
      intervalSeconds = config.get<number>('intervalSeconds', 10);
      clearInterval(interval);
      interval = setInterval(updateRandomDisplay, intervalSeconds * 1000);
      outputCh.appendLine(`[change]intervalSeconds: ${intervalSeconds}`);
    } else if (e.affectsConfiguration('vscode-image-import.imagePath')) {
      // 画像が含まれているフォルダに変更あり
      configImagePath = config.get<string>('imagePath', '');
      MyLoveCatViewPanel.updateConfigImagePath(configImagePath);
      MyLoveCatViewProvider.updateConfigImagePath(configImagePath);
      outputCh.appendLine(`[change]configImagePath: ${configImagePath}`);
    } else if (e.affectsConfiguration('vscode-image-import.isGooglePhoto')) {
      // Google フォトから画像を取得するかどうか（false の場合は内部保存画像を利用します）に変更あり
      isGooglePhoto = config.get<boolean>('isGooglePhoto', false);
      MyLoveCatViewPanel.updateIsGooglePhoto(isGooglePhoto);
      MyLoveCatViewProvider.updateIsGooglePhoto(isGooglePhoto);
      outputCh.appendLine(`[change]isGooglePhoto: ${isGooglePhoto}`);
      if (isGooglePhoto) {
        vscode.commands.executeCommand('vscode-image-import.randomUpdateFromGoogle');
      }
    }
  }));
}

// タイマーのコールバック関数
function updateRandomDisplay() {
  MyLoveCatViewPanel.randomUpdate();
  MyLoveCatViewProvider.randomUpdate();
}

// アルバムから写真一覧を取得して内部変数に保持する
async function listAlbumsWithRetry(outputCh: vscode.OutputChannel, context: vscode.ExtensionContext) {
  try {
    // 設定値に保存されたアルバムタイトル（デフォルト:'茶々と長政'）のアルバム ID を取得
    const config = vscode.workspace.getConfiguration('vscode-image-import');
    const targetAlbumTitle = config.get<string>('googlePhotoAlbumTitle', '茶々と長政');
    outputCh.appendLine(`Target album title: ${targetAlbumTitle}`);
    const albumId = await findAlbumIdByTitle(outputCh, context, targetAlbumTitle);
    outputCh.appendLine(`${targetAlbumTitle}:${albumId}`);
    if (albumId) {
      // アルバム内のメディアアイテムを取得
      const baseUrls = await findMediaItem(outputCh, context, albumId);
      if (baseUrls) {
        outputCh.appendLine(`Found media item: ${baseUrls.length}`);
        // 内部変数に保持したメディアアイテムの URL一覧 を更新
        MyLoveCatViewPanel.updateMediaItemBaseUrls(baseUrls);
        MyLoveCatViewProvider.updateMediaItemBaseUrls(baseUrls);
        // ランダムで表示の状態を更新
        MyLoveCatViewPanel.randomUpdate();
        MyLoveCatViewProvider.randomUpdate();
      } else {
        outputCh.appendLine('No media item found.');
      }
    } else {
      outputCh.appendLine('No album found.');
    }
  } catch (error: any) {
    outputCh.appendLine('Failed to list albums: ' + error.message);
    vscode.window.showErrorMessage('Failed to list albums: ' + error.message);
    throw error;
  }
}
