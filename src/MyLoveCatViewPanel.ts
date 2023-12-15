import * as vscode from 'vscode';
import { getHtmlForWebview, getWebviewOptions } from './utils';

/**
 * エディタに表示するためのクラス
 */
export class MyLoveCatViewPanel {
  public static currentPanel: MyLoveCatViewPanel | undefined;
  public configImagePath: string | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, configImagePath: string | undefined) {
    // すでにパネル表示している場合は、フォーカスを当て再表示させる
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._panel.reveal(undefined);
      return;
    }

    // パネル作成
    const webviewOptions:vscode.WebviewOptions = getWebviewOptions(extensionUri, configImagePath);
    const panel = vscode.window.createWebviewPanel(
      'viewPanelMyLoveCat', // パネル識別子
      'My Love Cat', // パネルタイトル
      vscode.ViewColumn.One, // パネル表示位置
      webviewOptions, // Webviewオプション
    );
    MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri, configImagePath);
  }

  // コンストラクタ
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    configImagePath: string | undefined
  ) {
    this.configImagePath = configImagePath;
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._update();
    // パネルが破棄された時のリソース解放処理を登録
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  // パネルを閉じた時に呼び出される (クリーンアップ処理追加)
  public dispose() {
    MyLoveCatViewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  // 表示内容を更新する
  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
  }

  // 設定画面から画像フォルダパスを更新された場合に呼び出される
  public static updateConfigImagePath(configImagePath: string | undefined) {
    if (MyLoveCatViewPanel.currentPanel) {
      // 画像フォルダパスを更新
      const webviewOptions:vscode.WebviewOptions = getWebviewOptions(MyLoveCatViewPanel.currentPanel._extensionUri, configImagePath);
      MyLoveCatViewPanel.currentPanel._panel.webview.options = webviewOptions;
      MyLoveCatViewPanel.currentPanel.configImagePath = configImagePath;
    }
  }

  // コマンドから「ランダム表示」を実行された場合に呼び出される
  public static randomUpdate() {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._update();
      return;
    }
  }
}