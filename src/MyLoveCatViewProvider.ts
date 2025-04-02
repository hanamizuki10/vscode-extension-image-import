import * as vscode from 'vscode';
import { getWebviewOptions } from './utils';
import { ViewBase } from './common/ViewBase';

/**
 * エクスプローラーに表示するためのクラス
 */
export class MyLoveCatViewProvider extends ViewBase implements vscode.WebviewViewProvider {
  public static currentProvider: MyLoveCatViewProvider | undefined;
  private _view?: vscode.WebviewView;

  /**
   * コンストラクタ
   */
  constructor(
    extensionUri: vscode.Uri,
    configImagePath: string | undefined,
    isGooglePhoto: boolean = false,
    outputCh?: vscode.OutputChannel,
  ) {
    super(extensionUri, configImagePath, isGooglePhoto, outputCh);
    MyLoveCatViewProvider.currentProvider = this;
  }

  /**
   * 最初に表示する際に呼び出される
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    webviewView.webview.options = getWebviewOptions(this._extensionUri, this.configImagePath);
    this.randomUpdate();
  }

  /**
   * 表示内容をランダムに更新する
   */
  public randomUpdate(): void {
    if (this._view) {
      this.updateWebviewContent(this._view.webview);
    }
  }

  /**
   * 設定画面から画像フォルダパスを更新された場合に呼び出される
   */
  public static updateConfigImagePath(configImagePath: string | undefined): void {
    if (MyLoveCatViewProvider.currentProvider) {
      if (MyLoveCatViewProvider.currentProvider._view) {
        // webviewのオプションを更新
        const webviewOptions: vscode.WebviewOptions = getWebviewOptions(
          MyLoveCatViewProvider.currentProvider._extensionUri, 
          configImagePath
        );
        MyLoveCatViewProvider.currentProvider._view.webview.options = webviewOptions;
      }
      MyLoveCatViewProvider.currentProvider.updateConfigImagePath(configImagePath);
    }
  }

  /**
   * Google Photoモードを更新する
   */
  public static updateIsGooglePhoto(isGooglePhoto: boolean): void {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider.updateIsGooglePhoto(isGooglePhoto);
    }
  }

  /**
   * コマンドから「ランダム表示」を実行された場合に呼び出される
   */
  public static randomUpdate(): void {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider.randomUpdate();
    }
  }

  /**
   * メディアアイテムのURLリストを更新する
   */
  public static updateMediaItemBaseUrls(baseUrls: string[]): void {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider.updateMediaItemBaseUrls(baseUrls);
    }
  }
}
