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
  public static readonly viewType = 'viewTypePanel';
  private _disposables: vscode.Disposable[] = [];

  public static randomUpdate() {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._update();
      return;
    }
  }

  public static createOrShow(extensionUri: vscode.Uri, configImagePath: string | undefined) {
    // TODO:この引数の意味をしっかりと後で確認する
    const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;
    // すでにパネルがある場合はそれを見せる
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._panel.reveal(column);
      return;
    }
    // パネルを作成
    const webviewType = 'viewTypePanel';
    const webviewTitle = 'My Love Cat';
    const webviewOptions:vscode.WebviewOptions = getWebviewOptions(extensionUri, configImagePath);
    const panel = vscode.window.createWebviewPanel(
      webviewType,
      webviewTitle,
      column || vscode.ViewColumn.One,
      webviewOptions,
    );
    MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri, configImagePath);
  }

  /**
   * 画像フォルダパスを更新する
   * @param extensionUri 
   * @param configImagePath 
   */
  public static updateConfigImagePath(configImagePath: string | undefined) {
    if (MyLoveCatViewPanel.currentPanel) {
      // 画像フォルダパスを更新
      const webviewOptions:vscode.WebviewOptions = getWebviewOptions(MyLoveCatViewPanel.currentPanel._extensionUri, configImagePath);
      MyLoveCatViewPanel.currentPanel._panel.webview.options = webviewOptions;
      MyLoveCatViewPanel.currentPanel.configImagePath = configImagePath;
    }
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
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      e => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );
  }
  public dispose() {
    MyLoveCatViewPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
  // 画像をランダムで表示する
  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
  }
}