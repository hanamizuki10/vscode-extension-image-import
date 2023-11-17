import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * ファイル一覧を取得する関数
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
 * ランダムな文字列を生成する
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
 * HTMLを生成する関数
 * @param webview 
 * @param extensionUri 
 * @returns 
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  // ランダムに表示する画像を選択
  const configImagePath: string | undefined= vscode.workspace.getConfiguration('vscode-image-import').get('imagePath');
  let imagePath;
  let filename;
  let catImageUri;
  if (configImagePath) {
    console.log('configImagePath', JSON.stringify(configImagePath));
    imagePath = configImagePath;
    const files = getFileList(configImagePath);
    if (files.length > 0) {
      console.log('files', files.join(', '));
      filename = files[Math.floor(Math.random() * files.length)];
      console.log('joinPath', vscode.Uri.joinPath(vscode.Uri.file(configImagePath),filename));
      catImageUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(configImagePath),filename));
    }
  } else {
    // デフォルトの画像を表示
    console.log('configImagePath is not set');
    imagePath = 'media';
    const images = ["MyLoveCat01.jpg","MyLoveCat02.jpg","MyLoveCat03.jpg"];
    filename = images[Math.floor(Math.random() * images.length)];
    console.log('joinPath', vscode.Uri.joinPath(extensionUri, imagePath, filename));
    catImageUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, imagePath, filename));
  }
  console.log('imagePath', imagePath);
  console.log('filename', filename);
  // ファイルパスを生成 
  if (!catImageUri) {
    return '画像が存在しません。設定[vscode-image-import]-[Image Path]を見直してください。';
  }
  // ファイルパスのURIを生成
  console.log('catImageUri', catImageUri);
  const catSrc = webview.asWebviewUri(catImageUri);
  const nonce = getNonce();
  console.log('catSrc', catSrc);
  console.log('webview.cspSource', webview.cspSource);
  
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
<p>${filename}</p>
<img src="${catSrc}"></img>
</body>
</html>`;
}


/**
 * Webviewのオプションを取得する関数
 * @param extensionUri 
 * @returns 
 */
export function getWebviewOptions(
  extensionUri: vscode.Uri,
): vscode.WebviewOptions & vscode.WebviewPanelOptions {
  const configImagePath: string | undefined = vscode.workspace.getConfiguration('vscode-image-import').get('imagePath');
  const webviewOptions: vscode.WebviewOptions = {
    // Webview で JavaScript を有効にする
    enableScripts: true,
    // ローカルリソースの画像を読み込むため必要なアクセス制御を追加
    localResourceRoots: (configImagePath) ?
     [vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.file(configImagePath)] : [vscode.Uri.joinPath(extensionUri, 'media')]
  };
  return webviewOptions;
}
