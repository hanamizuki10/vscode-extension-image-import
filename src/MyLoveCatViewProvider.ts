import * as vscode from 'vscode';
import { getHtmlForWebview, getWebviewOptions } from './utils';

/**
 * エクスプローラーに表示するためのクラス
 */
export class MyLoveCatViewProvider implements vscode.WebviewViewProvider {
	public static currentProvider: MyLoveCatViewProvider | undefined;
	public static readonly viewType = 'viewExplorerMyLoveCat';
	private _view?: vscode.WebviewView;
	public static randomUpdate() {
		if (MyLoveCatViewProvider.currentProvider) {
			MyLoveCatViewProvider.currentProvider._update();
			return;
		}
  }
  constructor(
		private readonly _extensionUri: vscode.Uri,
	) {
    MyLoveCatViewProvider.currentProvider = this;
  }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		webviewView.webview.options = getWebviewOptions(this._extensionUri);
    this._update();
	}

  private _update() {
    if (this._view) {
      const webview = this._view.webview;
      this._view.webview.html = getHtmlForWebview(webview, this._extensionUri);
    }
  }
}