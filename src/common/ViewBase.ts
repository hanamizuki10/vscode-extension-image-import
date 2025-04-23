import * as vscode from 'vscode';
import { generateWebviewHtmlForLocalImage, generateWebviewHtmlForGooglePhoto } from '../utils';

/**
 * MyLoveCatViewPanelとMyLoveCatViewProviderの共通機能を提供する基底クラス
 */
export abstract class ViewBase {
  public configImagePath: string | undefined;
  public isGooglePhoto: boolean = false;
  public baseUrls: string[] = [];
  protected readonly _extensionUri: vscode.Uri;
  protected readonly _outputCh: vscode.OutputChannel | undefined;
  protected _updateInterval: NodeJS.Timeout | undefined; // タイマーを保持する変数を追加

  constructor(
    extensionUri: vscode.Uri,
    configImagePath: string | undefined,
    isGooglePhoto: boolean = false,
    outputCh?: vscode.OutputChannel,
  ) {
    this.configImagePath = configImagePath;
    this.isGooglePhoto = isGooglePhoto;
    this._extensionUri = extensionUri;
    this._outputCh = outputCh;
  }

  /**
   * Webviewのコンテンツを更新する
   */
  protected async updateWebviewContent(webview: vscode.Webview): Promise<void> {
    if (this.isGooglePhoto) {
      webview.html = await generateWebviewHtmlForGooglePhoto(webview, this._extensionUri, this.baseUrls);
    } else {
      webview.html = generateWebviewHtmlForLocalImage(webview, this._extensionUri, this.configImagePath);
    }
  }

  /**
   * タイマーを開始するメソッド
   */
  protected startUpdateTimer(): void {
    // すでにタイマーが動いている場合は何もしない
    if (this._updateInterval) {
      console.log('タイマーはすでに動作中です');
      return;
    }
    
    const config = vscode.workspace.getConfiguration('vscode-image-import');
    const intervalSeconds = config.get<number>('intervalSeconds', 10);
    console.log(`タイマーを開始します: ${intervalSeconds}秒間隔`);
    this._updateInterval = setInterval(() => {
      console.log('タイマーによる更新を実行します');
      this.randomUpdate();
    }, intervalSeconds * 1000);
  }
  
  /**
   * タイマーを停止するメソッド
   */
  protected stopUpdateTimer(): void {
    if (this._updateInterval) {
      console.log('タイマーを停止します');
      clearInterval(this._updateInterval);
      this._updateInterval = undefined;
    } else {
      console.log('停止するタイマーがありません');
    }
  }
  
  /**
   * 更新間隔を変更するメソッド
   */
  public updateInterval(): void {
    if (this._updateInterval) {
      this.stopUpdateTimer();
      this.startUpdateTimer();
    }
  }

  /**
   * 設定画像パスを更新する
   */
  public updateConfigImagePath(configImagePath: string | undefined): void {
    this.configImagePath = configImagePath;
  }

  /**
   * Google Photoモードを更新する
   */
  public updateIsGooglePhoto(isGooglePhoto: boolean): void {
    this.isGooglePhoto = isGooglePhoto;
  }

  /**
   * メディアアイテムのURLリストを更新する
   */
  public updateMediaItemBaseUrls(baseUrls: string[]): void {
    this.baseUrls = baseUrls;
  }

  /**
   * 表示内容をランダムに更新する
   */
  public abstract randomUpdate(): void;
}
