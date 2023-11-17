import * as vscode from 'vscode';
import { getHtmlForWebview, getWebviewOptions } from './utils';

/**
 * エディタに表示するためのクラス
 */
export class MyLoveCatViewPanel {
	public static currentPanel: MyLoveCatViewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	public static readonly viewType = 'viewTypePanel';
	private _disposables: vscode.Disposable[] = [];

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri);
	}
  public static randomUpdate() {
    if (MyLoveCatViewPanel.currentPanel) {
			MyLoveCatViewPanel.currentPanel._update();
			return;
		}
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    // TODO:この引数の意味をしっかりと後で確認する
    const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;
    // すでにパネルがある場合はそれを見せる
		if (MyLoveCatViewPanel.currentPanel) {
			MyLoveCatViewPanel.currentPanel._panel.reveal(column);
			return;
		}
    const webviewType = 'viewTypePanel';
    const webviewTitle = 'My Love Cat';
    const webviewOptions:vscode.WebviewOptions = getWebviewOptions(extensionUri);
    // パネルを作成
    const panel = vscode.window.createWebviewPanel(
      webviewType,
      webviewTitle,
      column || vscode.ViewColumn.One,
      webviewOptions,
    );
		MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri);
  }
  // コンストラクタ
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
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
		this._panel.webview.html = getHtmlForWebview(webview, this._extensionUri);
  }
}