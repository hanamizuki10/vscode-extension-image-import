import * as vscode from 'vscode';
import { MyLoveCatViewPanel } from './MyLoveCatViewPanel';
import { MyLoveCatViewProvider } from './MyLoveCatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  //==========================================================================
  // 設定値取得
  //==========================================================================
  let intervalSeconds = vscode.workspace.getConfiguration().get('vscode-image-import.intervalSeconds', 10);
  let configImagePath: string | undefined = vscode.workspace.getConfiguration().get('vscode-image-import.imagePath');
  //==========================================================================
  // エディタに表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewPanelMyLoveCat', () => {
      MyLoveCatViewPanel.createOrShow(context.extensionUri, configImagePath);
    })
  );
  //==========================================================================
  // explorer に表示
  //==========================================================================
  context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
      MyLoveCatViewProvider.viewType,
      new MyLoveCatViewProvider(context.extensionUri, configImagePath))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewExplorerMyLoveCat', () => {
      // すでにエクスプローラーには情報を表示しているけど、フォーカスを当てる感じ
      // 隠れていたら展開して表示するしエクスプローラーを閉じていたら開く
      vscode.commands.executeCommand('viewExplorerMyLoveCat.focus');
    })
  );

  //==========================================================================
  // コマンド指定で画像をランダムに差し替え
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewMyLoveCatRandom', () => {
      // 描画されている猫をrandomで描画切り替え
      MyLoveCatViewPanel.randomUpdate();
      MyLoveCatViewProvider.randomUpdate();
    })
  );

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
  //==========================================================================
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('vscode-image-import.intervalSeconds')) {
      // ランダム表示の更新間隔（秒）に変更あり
      intervalSeconds = vscode.workspace.getConfiguration().get('vscode-image-import.intervalSeconds', 10);
      clearInterval(interval);
      interval = setInterval(updateRandomDisplay, intervalSeconds * 1000);
    } else if (e.affectsConfiguration('vscode-image-import.imagePath')) {
      // 画像が含まれているフォルダに変更あり
      configImagePath = vscode.workspace.getConfiguration().get('vscode-image-import.imagePath');
      MyLoveCatViewPanel.updateConfigImagePath(configImagePath);
      MyLoveCatViewProvider.updateConfigImagePath(configImagePath);
    }
  }));
}

// タイマーのコールバック関数
function updateRandomDisplay() {
  MyLoveCatViewPanel.randomUpdate();
  MyLoveCatViewProvider.randomUpdate();
}