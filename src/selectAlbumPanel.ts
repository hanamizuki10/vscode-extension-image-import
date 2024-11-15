import * as vscode from 'vscode';

export function createSelectAlbumPanel(context: vscode.ExtensionContext, albums: Album[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const panel = vscode.window.createWebviewPanel(
      'selectAlbum',  // パネルの識別子
      'アルバムの選択',  // パネルのタイトル
      vscode.ViewColumn.One,  // パネルを表示するエディタの列
      { enableScripts: true }  // スクリプトの実行を許可
    );

    // WebviewのHTML内容をセット
    panel.webview.html = getWebviewContent(albums);
    panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === 'submit') {
          resolve(message.albumTitle);
          panel.dispose();  // 受け取ったらパネルを閉じる
        }
      },
      undefined,
      context.subscriptions
    );

    panel.onDidDispose(() => {
      reject(new Error('Panel was closed without selection'));
    }, null, context.subscriptions);
  });
}

function getWebviewContent(albums: Album[]): string {
  if (albums.length === 0) {
    // アルバムが存在しない場合
    return `
      <html>
      <body>
          <p>アルバムが存在しません。Google Photos にアルバムを作成してください。</p>
      </body>
      </html>
      `;
  }
  // アルバムが存在する場合、ラジオボタンでアルバムを選択
  return `
  <html>
  <body>
      <h1>アルバムを選択してください</h1>
      <form onsubmit="submitData()">
          ${albums.map(album => `
              <input type="radio" name="album" value="${album.title}" id="${album.title}">
              <label for="${album.title}">${album.title}</label><br>
          `).join('')}
        <button type="submit">送信</button>
      </form>
      <script>
          const vscode = acquireVsCodeApi();
          function submitData() {
              const albumTitle = document.querySelector('input[name="album"]:checked').value;
              vscode.postMessage({
                  command: 'submit',
                  albumTitle: albumTitle
              });
          }
      </script>
  </body>
  </html>
  `;
}
