import * as vscode from 'vscode';

export function createSecretPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'clientSecretInput',  // パネルの識別子
    'クライアント ID とクライアント シークレットの設定',  // パネルのタイトル
    vscode.ViewColumn.One,  // パネルを表示するエディタの列
    { enableScripts: true }  // スクリプトの実行を許可
  );

  // WebviewのHTML内容をセット
  panel.webview.html = getWebviewContent();
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'submit') {
        await context.secrets.store('CLIENT_ID', message.clientId);
        await context.secrets.store('CLIENT_SECRET', message.clientSecret);
        panel.dispose();  // 受け取ったらパネルを閉じる
      }
    },
    undefined,
    context.subscriptions
  );
  return panel;
}

function getWebviewContent(): string {
    return `
    <html>
    <body>
        <form onsubmit="submitSecretData()">
            <input type="password" id="clientId" placeholder="クライアント IDを入力"/>
            <input type="password" id="clientSecret" placeholder="クライアント シークレットを入力"/>
            <button type="submit">送信</button>
        </form>
        <script>
            const vscode = acquireVsCodeApi();
            function submitSecretData() {
                const clientId = document.getElementById('clientId').value;
                const clientSecret = document.getElementById('clientSecret').value;
                vscode.postMessage({
                    command: 'submit',
                    clientId: clientId,
                    clientSecret: clientSecret
                });
            }
        </script>
    </body>
    </html>
    `;
}
