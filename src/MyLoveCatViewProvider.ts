import * as vscode from 'vscode';
import { getHtmlForWebview, getWebviewOptions } from './utils';

/**
 * エクスプローラーに表示するためのクラス
 */
export class MyLoveCatViewProvider implements vscode.WebviewViewProvider {
  public static currentProvider: MyLoveCatViewProvider | undefined;
  public static readonly viewType = 'viewExplorerMyLoveCat';
  public configImagePath: string | undefined;
  private _view?: vscode.WebviewView;
  public static updateConfigImagePath(configImagePath: string | undefined) {
    if (MyLoveCatViewProvider.currentProvider) {
      // 画像フォルダパスを更新
      if (MyLoveCatViewProvider.currentProvider._view) {
        const webviewOptions: vscode.WebviewOptions = getWebviewOptions(MyLoveCatViewProvider.currentProvider._extensionUri, configImagePath);
        MyLoveCatViewProvider.currentProvider._view.webview.options = webviewOptions;
      }
      MyLoveCatViewProvider.currentProvider.configImagePath = configImagePath;
    }
  }
  public static randomUpdate() {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider._update();
      return;
    }
  }
  constructor(
    private readonly _extensionUri: vscode.Uri,
    configImagePath: string | undefined
  ) {
    this.configImagePath = configImagePath;
    MyLoveCatViewProvider.currentProvider = this;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    webviewView.webview.options = getWebviewOptions(this._extensionUri, this.configImagePath);
    this._update();
  }

  private _update() {
    if (this._view) {
      const webview = this._view.webview;
      this._view.webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
    }
  }
}