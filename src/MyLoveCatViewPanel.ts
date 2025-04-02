import * as vscode from 'vscode';
import { getWebviewOptions } from './utils';
import { ViewBase } from './common/ViewBase';

/**
 * エディタに表示するためのクラス
 */
export class MyLoveCatViewPanel extends ViewBase {
  public static currentPanel: MyLoveCatViewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  /**
   * パネルを作成または表示する
   */
  public static createOrShow(
    extensionUri: vscode.Uri, 
    configImagePath: string | undefined, 
    isGooglePhoto: boolean = false, 
    outputCh?: vscode.OutputChannel
  ): void {
    // すでにパネル表示している場合は、フォーカスを当て再表示させる
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel._panel.reveal(undefined);
      return;
    }

    // パネル作成
    const webviewOptions: vscode.WebviewOptions = getWebviewOptions(extensionUri, configImagePath);
    const panel = vscode.window.createWebviewPanel(
      'viewPanelMyLoveCat', // パネル識別子
      'My Love Cat', // パネルタイトル
      vscode.ViewColumn.One, // パネル表示位置
      webviewOptions, // Webviewオプション
    );
    MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri, configImagePath, isGooglePhoto, outputCh);
  }

  /**
   * コンストラクタ
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    configImagePath: string | undefined,
    isGooglePhoto: boolean = false,
    outputCh?: vscode.OutputChannel,
  ) {
    super(extensionUri, configImagePath, isGooglePhoto, outputCh);
    this._panel = panel;
    this.randomUpdate();
    
    // パネルが破棄された時のリソース解放処理を登録
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * パネルを閉じた時に呼び出される (クリーンアップ処理追加)
   */
  public dispose(): void {
    MyLoveCatViewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * 表示内容をランダムに更新する
   */
  public randomUpdate(): void {
    if (this._panel.webview) {
      this.updateWebviewContent(this._panel.webview);
    }
  }

  /**
   * 設定画面から画像フォルダパスを更新された場合に呼び出される
   */
  public static updateConfigImagePath(configImagePath: string | undefined): void {
    if (MyLoveCatViewPanel.currentPanel) {
      if (MyLoveCatViewPanel.currentPanel._panel) {
        // webviewのオプションを更新
        const webviewOptions: vscode.WebviewOptions = getWebviewOptions(
          MyLoveCatViewPanel.currentPanel._extensionUri, 
          configImagePath
        );
        MyLoveCatViewPanel.currentPanel._panel.webview.options = webviewOptions;
      }
      MyLoveCatViewPanel.currentPanel.updateConfigImagePath(configImagePath);
    }
  }

  /**
   * Google Photoモードを更新する
   */
  public static updateIsGooglePhoto(isGooglePhoto: boolean): void {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel.updateIsGooglePhoto(isGooglePhoto);
    }
  }

  /**
   * コマンドから「ランダム表示」を実行された場合に呼び出される
   */
  public static randomUpdate(): void {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel.randomUpdate();
    }
  }

  /**
   * メディアアイテムのURLリストを更新する
   */
  public static updateMediaItemBaseUrls(baseUrls: string[]): void {
    if (MyLoveCatViewPanel.currentPanel) {
      MyLoveCatViewPanel.currentPanel.updateMediaItemBaseUrls(baseUrls);
    }
  }
}
