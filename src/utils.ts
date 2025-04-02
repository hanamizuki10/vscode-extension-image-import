import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import fetch from 'node-fetch';

/**
 * ファイル一覧を取得する
 * @param directoryPath 
 * @returns 
 */
function getFileList(directoryPath: string): string[] {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  try {
    // ファイル一覧を取得
    const files = fs.readdirSync(directoryPath).filter(file => {
      const ext = path.extname(file).toLowerCase(); // ファイルの拡張子を取得
      return imageExtensions.includes(ext); // 画像の拡張子に一致するものだけを返す
    });
    
    // ファイルの絶対パスに変換します。
    return files;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

/**
 * コンテンツセキュリティポリシーnonce用: ランダムな文字列を生成する
 * @returns 
 */
function getNonce() {
  let text = '';
  const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * HTMLを生成する
 * @param webview 
 * @param extensionUri 
 * @returns 
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, configImagePath: string | undefined): string {
  // ランダムに表示する画像を選択
  let imagePath;
  let filename = '';
  let catImageUri;
  if (configImagePath) {
    // console.log('configImagePath', JSON.stringify(configImagePath));
    imagePath = configImagePath;
    const files = getFileList(configImagePath);
    if (files.length > 0) {
      //console.log('files', files.join(', '));
      filename = files[Math.floor(Math.random() * files.length)];
      //console.log('joinPath', vscode.Uri.joinPath(vscode.Uri.file(configImagePath),filename));
      catImageUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(configImagePath),filename));
    }
  } else {
    // デフォルトの画像を表示
    //console.log('configImagePath is not set');
    imagePath = 'media';
    const images = ["MyLoveCat01.jpg","MyLoveCat02.jpg","MyLoveCat03.jpg"];
    filename = images[Math.floor(Math.random() * images.length)];
    //console.log('joinPath', vscode.Uri.joinPath(extensionUri, imagePath, filename));
    catImageUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, imagePath, filename));
  }
  // console.log('imagePath', imagePath);
  // console.log('filename', filename);
  // 画像が存在しない場合はエラーメッセージを表示
  if (!catImageUri) {
    return '画像が存在しません。設定[vscode-image-import]-[Image Path]を見直してください。';
  }
  // ファイルパスのURIを生成
  //console.log('catImageUri', catImageUri);
  const catSrc = webview.asWebviewUri(catImageUri);
  const nonce = getNonce();
  //console.log('catSrc', catSrc);
  //console.log('webview.cspSource', webview.cspSource);
  return  `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<!--
コンテンツセキュリティポリシーを使用して、httpsまたは拡張ディレクトリからの画像の読み込みのみを許可し、
特定の nonce を持つスクリプトのみを許可します。
-->
<meta http-equiv="Content-Security-Policy" content="default-src 'none';
  style-src ${webview.cspSource} 'nonce-${nonce}';
  img-src ${webview.cspSource} https:;
  script-src 'nonce-${nonce}';
  font-src ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>My Love Cat</title>
</head>
<body>
<p>フォルダから画像参照</p>
<p>${imagePath}</p>
<p>${filename}</p>
<img src="${catSrc}"></img>
</body>
</html>`;
}

export async function getHtmlForWebviewEx(webview: vscode.Webview, extensionUri: vscode.Uri, baseUrls: string[]): Promise<string> {
// memo :
// mediaItems.baseUrlの値を活用（少なくても、ログインしなくても表示可能）productUrlはログインしている場合にのみ利用可能
// baseUrlはしばらくすると使えなくなる動きをしている。直前にとってきた値のみ使えるようになっている
  const baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
  if (baseUrl === undefined) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <title>My Love Cat</title>
    </head>
    <body>
    <p>GoogleAPIを経由した画像の表示</p>
    <p>指定のアルバムには画像情報が存在しない、または、認証されていないためGoogleフォトからメディア情報を取得できません。</p>
    </body>
    </html>`;
  }
  //console.log('baseUrl', baseUrl);
  const nonce = getNonce();

  const result = await isURLAlive(baseUrl);
  //console.log(`${baseUrl} is alive: ${result}`);

  const imgWidth = 480; // mediaItems.mediaMetadata.widthの値を活用
  return  `<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <!--
  コンテンツセキュリティポリシーを使用して、httpsまたは拡張ディレクトリからの画像の読み込みのみを許可し、
  特定の nonce を持つスクリプトのみを許可します。
  -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none';
    style-src ${webview.cspSource} 'nonce-${nonce}';
    img-src ${webview.cspSource} https:;
    script-src 'nonce-${nonce}';
    font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Love Cat</title>
  </head>
  <body>
  <p>GoogleAPIを経由した画像の表示</p>
  <img width="${imgWidth}"  src="${baseUrl}"></img>
  </body>
  </html>`;
}

/**
 * Webviewのオプションを生成して返却する
 * @param extensionUri 
 * @returns 
 */
export function getWebviewOptions(
  extensionUri: vscode.Uri,
  configImagePath: string | undefined
): vscode.WebviewOptions & vscode.WebviewPanelOptions {
  const webviewOptions: vscode.WebviewOptions = {
    // Webview で JavaScript を有効にする
    enableScripts: true,
    // ローカルリソースの画像を読み込むため必要なアクセス制御を追加
    localResourceRoots: (configImagePath) ?
    [vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.file(configImagePath)] : [vscode.Uri.joinPath(extensionUri, 'media')]
  };
  return webviewOptions;
}

// URLが生きているかどうかを確認する
async function isURLAlive(url: string): Promise<boolean> {
  try {
      const response = await fetch(url);
      return response.ok; // ステータスコードが200-299ならtrue、それ以外ならfalseを返します
  } catch (error) {
      return false; // ネットワークエラーやその他の例外でリクエストが失敗した場合はfalseを返します
  }
}

