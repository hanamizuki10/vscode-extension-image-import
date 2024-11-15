import * as vscode from 'vscode';
import { getHtmlForWebview, getHtmlForWebviewEx, getWebviewOptions } from './utils';

/**
 * エディタに表示するためのクラス
 */
export class MyLoveCatViewPanel {
  public static currentPanel: MyLoveCatViewPanel | undefined;
  public configImagePath: string | undefined;
  public isGooglePhoto: boolean = false;
  public baseUrls: string[] = [];
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _outputCh: vscode.OutputChannel | undefined;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, configImagePath: string | undefined, outputCh?: vscode.OutputChannel) {
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
    MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri, configImagePath, outputCh);
  }

  // コンストラクタ
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    configImagePath: string | undefined,
    outputCh?: vscode.OutputChannel,
  ) {
    this.configImagePath = configImagePath;
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._outputCh = outputCh;
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
  private async _update() {
    const webview = this._panel.webview;
    //this._outputCh?.appendLine(`MyLoveCatViewPanel _update this.isGooglePhoto: ${this.isGooglePhoto}`);
    if (this.isGooglePhoto) {
      // TODO: 複数のURL配列の中からランダムで表示できるように改善したい
      this._panel.webview.html = await getHtmlForWebviewEx(webview, this._extensionUri, this.baseUrls);
    } else {
      this._panel.webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
    }
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
  public static updateIsGooglePhoto(isGooglePhoto: boolean) {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel.isGooglePhoto = isGooglePhoto;
    }
  }

  // コマンドから「ランダム表示」を実行された場合に呼び出される
  public static randomUpdate() {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._update();
      return;
    }
  }

  public static updateMediaItemBaseUrls(baseUrls: string[]) {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel.baseUrls = baseUrls;
    }
  }
}