import * as vscode from 'vscode';
import { getHtmlForWebview, getHtmlForWebviewEx, getWebviewOptions } from '../utils';

/**
 * MyLoveCatViewPanelとMyLoveCatViewProviderの共通機能を提供する基底クラス
 */
export abstract class ViewBase {
  public configImagePath: string | undefined;
  public isGooglePhoto: boolean = false;
  public baseUrls: string[] = [];
  protected readonly _extensionUri: vscode.Uri;
  protected readonly _outputCh: vscode.OutputChannel | undefined;

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
      webview.html = await getHtmlForWebviewEx(webview, this._extensionUri, this.baseUrls);
    } else {
      webview.html = getHtmlForWebview(webview, this._extensionUri, this.configImagePath);
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
