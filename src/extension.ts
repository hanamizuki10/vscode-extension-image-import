import * as vscode from 'vscode';
import { MyLoveCatViewPanel } from './MyLoveCatViewPanel';
import { MyLoveCatViewProvider } from './MyLoveCatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  //==========================================================================
  // エディタに表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewPanelMyLoveCat', () => {
      MyLoveCatViewPanel.createOrShow(context.extensionUri);
    })
  );
  //==========================================================================
  // explorer に表示
  //==========================================================================
  context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MyLoveCatViewProvider.viewType, new MyLoveCatViewProvider(context.extensionUri))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewExplorerMyLoveCat', () => {
      // すでにエクスプローラーには情報を表示しているけど、フォーカスを当てる感じ
      // 隠れていたら展開して表示するしエクスプローラーを閉じていたら開く
      vscode.commands.executeCommand('viewExplorerMyLoveCat.focus');
    })
  );
  //==========================================================================
  // ランダムで表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewMyLoveCatRandom', () => {
      // 描画されている猫をrandomで描画切り替え
      MyLoveCatViewPanel.randomUpdate();
      MyLoveCatViewProvider.randomUpdate();
    })
  );
}