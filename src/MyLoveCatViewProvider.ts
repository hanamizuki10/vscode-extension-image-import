import * as vscode from 'vscode';
import { getHtmlForWebview, getWebviewOptions } from './utils';

/**
 * エクスプローラーに表示するためのクラス
 */
export class MyLoveCatViewProvider implements vscode.WebviewViewProvider {
  public static currentProvider: MyLoveCatViewProvider | undefined;
  public configImagePath: string | undefined;
  private _view?: vscode.WebviewView;
  // コンストラクタ(初期パスを設定)
  constructor(
    private readonly _extensionUri: vscode.Uri,
    configImagePath: string | undefined
  ) {
    this.configImagePath = configImagePath;
    MyLoveCatViewProvider.currentProvider = this;
  }
  // 最初に表示する際に呼び出される
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    webviewView.webview.options = getWebviewOptions(this._extensionUri, this.configImagePath);
    this._update();
  }
  // 表示内容を更新する
  private _update() {
    if (this._view) {
      const webview = this._view.webview;
      this._view.webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
    }
  }
  // 設定画面から画像フォルダパスを更新された場合に呼び出される
  public static updateConfigImagePath(configImagePath: string | undefined) {
    if (MyLoveCatViewProvider.currentProvider) {
      if (MyLoveCatViewProvider.currentProvider._view) {
        // webviewのオプションを更新
        const webviewOptions: vscode.WebviewOptions = getWebviewOptions(MyLoveCatViewProvider.currentProvider._extensionUri, configImagePath);
        MyLoveCatViewProvider.currentProvider._view.webview.options = webviewOptions;
      }
      MyLoveCatViewProvider.currentProvider.configImagePath = configImagePath;
    }
  }
  // コマンドから「ランダム表示」を実行された場合に呼び出される
  public static randomUpdate() {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider._update();
      return;
    }
  }
}