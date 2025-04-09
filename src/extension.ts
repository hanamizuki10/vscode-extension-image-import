import * as vscode from 'vscode';
import { Auth } from 'googleapis';
import open from 'open';
import * as http from 'http';
import { MyLoveCatViewPanel } from './MyLoveCatViewPanel';
import { MyLoveCatViewProvider } from './MyLoveCatViewProvider';
import { createSecretPanel } from './secretPanel';
import { createSelectAlbumPanel } from './selectAlbumPanel';
import { AuthService } from './services/authService';
import { GooglePhotosService } from './services/googlePhotosService';
/**
 * 拡張機能のエントリーポイント
 */
export async function activate(context: vscode.ExtensionContext) {
  // 出力チャンネルの初期化
  const outputCh = initializeOutputChannel();
  
  // 設定値の取得
  const { intervalSeconds, configImagePath, isGooglePhoto } = getConfiguration();
  outputCh.appendLine(`intervalSeconds: ${intervalSeconds}`);
  outputCh.appendLine(`configImagePath: ${configImagePath}`);
  outputCh.appendLine(`isGooglePhoto: ${isGooglePhoto}`);
  
  // コマンドの登録
  registerCommands(context, outputCh, configImagePath, isGooglePhoto);
  
  // 初期設定
  initializeViews(isGooglePhoto);
  
  // Google Photosからの画像取得（設定が有効な場合）
  if (isGooglePhoto) {
    vscode.commands.executeCommand('vscode-image-import.randomUpdateFromGoogle');
  }
  
  // 設定変更時のイベントハンドラを登録
  registerConfigChangeHandler(context, outputCh);
}

/**
 * 出力チャンネルを初期化する
 */
function initializeOutputChannel(): vscode.OutputChannel {
  const outputCh = vscode.window.createOutputChannel("VScode Image Import");
  outputCh.show();
  outputCh.appendLine('Congratulations, your extension "vscode-image-import" is now active!');
  return outputCh;
}

/**
 * 設定値を取得する
 */
function getConfiguration(): { intervalSeconds: number; configImagePath: string; isGooglePhoto: boolean } {
  const config = vscode.workspace.getConfiguration('vscode-image-import');
  const intervalSeconds = config.get<number>('intervalSeconds', 10);
  const configImagePath = config.get<string>('imagePath', '');
  const isGooglePhoto = config.get<boolean>('isGooglePhoto', false);
  
  return { intervalSeconds, configImagePath, isGooglePhoto };
}

/**
 * コマンドを登録する
 */
function registerCommands(
  context: vscode.ExtensionContext, 
  outputCh: vscode.OutputChannel, 
  configImagePath: string, 
  isGooglePhoto: boolean
): void {
  // エクスプローラーにWebViewを登録
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'viewExplorerMyLoveCat',
      new MyLoveCatViewProvider(context.extensionUri, configImagePath, isGooglePhoto, outputCh)
    )
  );
  
  // [MyLoveCat: Explorer View] コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewExplorerMyLoveCat', () => {
      vscode.commands.executeCommand('viewExplorerMyLoveCat.focus');
    })
  );
  
  // [MyLoveCat: Panel View] コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewPanelMyLoveCat', () => {
      MyLoveCatViewPanel.createOrShow(context.extensionUri, configImagePath, isGooglePhoto, outputCh);
    })
  );
  
  // [MyLoveCat: Image Random Update] コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewMyLoveCatRandom', () => {
      MyLoveCatViewPanel.randomUpdate();
      MyLoveCatViewProvider.randomUpdate();
    })
  );
  
  // [MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.inputSecretData', () => {
      registerSecretDataCommand(context, outputCh);
    })
  );
  
  // [MyLoveCat: Image Random Update(From Google)] コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.randomUpdateFromGoogle', async () => {
      const tokens = context.globalState.get('oauthTokens');
      outputCh.appendLine('tokens: ' + JSON.stringify(tokens));
      listAlbumsWithRetry(outputCh, context);
    })
  );
}

/**
 * シークレットデータ入力コマンドの処理
 */
function registerSecretDataCommand(context: vscode.ExtensionContext, outputCh: vscode.OutputChannel): void {
  const panel = createSecretPanel(context);
  const config = vscode.workspace.getConfiguration('vscode-image-import');
  
  // パネルが閉じられたことを検知したら再認証を促す
  panel.onDidDispose(async () => {
    await AuthService.authenticate(outputCh, context);
    // Google Photos からアルバム一覧を取得
    const albums = await GooglePhotosService.getAlbums(outputCh, context);
    outputCh.appendLine('albums: ' + JSON.stringify(albums));
    // 取得したGoogle Photosのアルバム一覧を画面上に表示して選択させる
    const albumTitle = await createSelectAlbumPanel(context, albums);
    outputCh.appendLine('albumTitle: ' + JSON.stringify(albumTitle));
    // ユーザー選択結果を保存
    config.update('googlePhotoAlbumTitle', albumTitle, true);
    // Google Photosから画像を一覧取得して、ランダムに画像を表示させる
    listAlbumsWithRetry(outputCh, context);
  }, null, context.subscriptions);
}

/**
 * ビューの初期化
 */
function initializeViews(isGooglePhoto: boolean): void {
  MyLoveCatViewPanel.updateIsGooglePhoto(isGooglePhoto);
  MyLoveCatViewProvider.updateIsGooglePhoto(isGooglePhoto);
}

/**
 * 設定変更時のイベントハンドラを登録
 */
function registerConfigChangeHandler(
  context: vscode.ExtensionContext, 
  outputCh: vscode.OutputChannel
): void {
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    const config = vscode.workspace.getConfiguration('vscode-image-import');
    
    if (e.affectsConfiguration('vscode-image-import.intervalSeconds')) {
      // ランダム表示の更新間隔（秒）に変更あり
      const intervalSeconds = config.get<number>('intervalSeconds', 10);
      // 各コンポーネントに通知して、内部でタイマーを再設定してもらう
      MyLoveCatViewPanel.updateInterval();
      MyLoveCatViewProvider.updateInterval();
      outputCh.appendLine(`[change]intervalSeconds: ${intervalSeconds}`);
    } else if (e.affectsConfiguration('vscode-image-import.imagePath')) {
      // 画像が含まれているフォルダに変更あり
      const configImagePath = config.get<string>('imagePath', '');
      MyLoveCatViewPanel.updateConfigImagePath(configImagePath);
      MyLoveCatViewProvider.updateConfigImagePath(configImagePath);
      outputCh.appendLine(`[change]configImagePath: ${configImagePath}`);
    } else if (e.affectsConfiguration('vscode-image-import.isGooglePhoto')) {
      // Google フォトから画像を取得するかどうか（false の場合は内部保存画像を利用します）に変更あり
      const isGooglePhoto = config.get<boolean>('isGooglePhoto', false);
      MyLoveCatViewPanel.updateIsGooglePhoto(isGooglePhoto);
      MyLoveCatViewProvider.updateIsGooglePhoto(isGooglePhoto);
      outputCh.appendLine(`[change]isGooglePhoto: ${isGooglePhoto}`);
      if (isGooglePhoto) {
        vscode.commands.executeCommand('vscode-image-import.randomUpdateFromGoogle');
      }
    }
  }));
}

/**
 * アルバムから写真一覧を取得して内部変数に保持する
 */
async function listAlbumsWithRetry(outputCh: vscode.OutputChannel, context: vscode.ExtensionContext) {
  try {
    // 設定値に保存されたアルバムタイトル（デフォルト:'茶々と長政'）のアルバム ID を取得
    const config = vscode.workspace.getConfiguration('vscode-image-import');
    const targetAlbumTitle = config.get<string>('googlePhotoAlbumTitle', '茶々と長政');
    outputCh.appendLine(`Target album title: ${targetAlbumTitle}`);
    const albumId = await GooglePhotosService.findAlbumIdByTitle(outputCh, context, targetAlbumTitle);
    outputCh.appendLine(`${targetAlbumTitle}:${albumId}`);
    if (albumId) {
      // アルバム内のメディアアイテムを取得
      const baseUrls = await GooglePhotosService.findMediaItem(outputCh, context, albumId);
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
