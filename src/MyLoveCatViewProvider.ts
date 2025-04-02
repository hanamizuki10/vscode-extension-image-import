import * as vscode from 'vscode';
import { getWebviewOptions } from './utils';
import { ViewBase } from './common/ViewBase';

/**
 * エクスプローラーに表示するためのクラス
 */
export class MyLoveCatViewProvider extends ViewBase implements vscode.WebviewViewProvider {
  public static currentProvider: MyLoveCatViewProvider | undefined;
  private _view?: vscode.WebviewView;
  private _isVisible: boolean = false; // ビューの表示状態を追跡

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
    console.log('MyLoveCatViewProvider.resolveWebviewView() が呼び出されました');
    console.log(`isGooglePhoto: ${this.isGooglePhoto}, baseUrls.length: ${this.baseUrls.length}`);
    
    this._view = webviewView;
    webviewView.webview.options = getWebviewOptions(this._extensionUri, this.configImagePath);
    
    // Google Photoモードが有効で、baseUrlsが空の場合は、randomUpdateFromGoogleコマンドを実行
    if (this.isGooglePhoto) {
      console.log(`Google Photoモードが有効です。baseUrls.length: ${this.baseUrls.length}`);
      if (this.baseUrls.length === 0) {
        console.log('baseUrlsが空なので、randomUpdateFromGoogleコマンドを実行します');
        vscode.commands.executeCommand('vscode-image-import.randomUpdateFromGoogle');
      }
    }
    
    this.randomUpdate();
    
    // ビューが表示されたときにタイマーを開始
    this._isVisible = true;
    console.log('タイマーを開始します');
    this.startUpdateTimer();
    
    // ビューの表示状態が変わったときのイベントハンドラを登録
    webviewView.onDidChangeVisibility(() => {
      this._isVisible = webviewView.visible;
      console.log(`ビューの表示状態が変更されました: ${this._isVisible}`);
      if (this._isVisible) {
        console.log('ビューが表示されたので、タイマーを開始します');
        this.startUpdateTimer(); // ビューが表示されたらタイマーを開始
      } else {
        console.log('ビューが非表示になったので、タイマーを停止します');
        this.stopUpdateTimer(); // ビューが非表示になったらタイマーを停止
      }
    });
    
    // ビューが破棄されたときのイベントハンドラを登録
    webviewView.onDidDispose(() => {
      console.log('ビューが破棄されたので、タイマーを停止します');
      this.stopUpdateTimer();
    });
  }

  /**
   * 表示内容をランダムに更新する
   */
  public randomUpdate(): void {
    console.log('MyLoveCatViewProvider.randomUpdate() が呼び出されました');
    console.log(`isGooglePhoto: ${this.isGooglePhoto}, baseUrls.length: ${this.baseUrls.length}`);
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
  
  /**
   * 更新間隔を変更する
   */
  public static updateInterval(): void {
    if (MyLoveCatViewProvider.currentProvider) {
      MyLoveCatViewProvider.currentProvider.updateInterval();
    }
  }
}
