import * as vscode from 'vscode';
import { Auth, google } from 'googleapis';
import open from 'open';
import * as http from 'http';
import * as url from 'url';
import { SCOPES } from '../api/photoslibrary';

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

/**
 * 認証関連のサービスクラス
 */
export class AuthService {
  /**
   * クライアントIDとクライアントシークレットが設定されているか確認する
   */
  public static async isSetClientIdSecret(
    outputCh: vscode.OutputChannel, 
    secrets: vscode.SecretStorage
  ): Promise<boolean> {
    const clientId = await secrets.get('CLIENT_ID');
    const clientSecret = await secrets.get('CLIENT_SECRET');
    return !!(clientId && clientSecret);
  }

  /**
   * 認証済みか確認する
   */
  public static isAuthenticated(tokens: Auth.Credentials): boolean {
    return !!tokens;
  }

  /**
   * トークンの有効期限が切れているか確認する
   */
  public static isTokenExpired(tokens: Auth.Credentials): boolean {
    return !!(tokens && tokens.expiry_date && tokens.expiry_date < Date.now());
  }

  /**
   * OAuth2 クライアントに認証情報がセットされているか確認する
   */
  public static isCredentialsSet(oauth2Client: Auth.OAuth2Client): boolean {
    return !!(oauth2Client.credentials && Object.keys(oauth2Client.credentials).length > 0);
  }

  /**
   * OAuth2 クライアントを取得する
   */
  public static async getOAuth2Client(
    outputCh: vscode.OutputChannel, 
    secrets: vscode.SecretStorage
  ): Promise<Auth.OAuth2Client> {
    // SecretStorageから各秘密情報を非同期で取得
    const clientId = await secrets.get('CLIENT_ID');
    const clientSecret = await secrets.get('CLIENT_SECRET');
    
    // 環境変数が正しく設定されていない場合はエラーを投げる
    if (!clientId || !clientSecret) {
      throw new Error('OAuth 2.0 クライアント情報の取得に失敗しました。[MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド実行して情報を入力してください。');
    }

    // OAuth2クライアントの生成
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  }

  /**
   * 認証を行う
   */
  public static async authenticate(
    outputCh: vscode.OutputChannel,
    context: vscode.ExtensionContext
  ): Promise<void> {
    const oauth2Client = await this.getOAuth2Client(outputCh, context.secrets);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });

    // ブラウザで認証URLを開く
    outputCh.appendLine('Opening the browser for authentication...');
    await open(authUrl);

    // HTTPサーバーを立ててリダイレクトURLを処理
    outputCh.appendLine('Waiting for the OAuth callback...');
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/oauth2callback')) {
          outputCh.appendLine('Handling the OAuth callback...');
          const query = url.parse(req.url, true).query;
          const code = query.code as string;
          if (code) {
            try {
              const { tokens } = await oauth2Client.getToken(code);
              oauth2Client.setCredentials(tokens);
              context.globalState.update('oauthTokens', tokens);
              res.end('Authentication successful! You can close this window.');
              outputCh.appendLine('Authentication successful!' + JSON.stringify(tokens));
              outputCh.appendLine('    [新しいアクセストークン] ' + JSON.stringify(tokens.access_token));
              outputCh.appendLine('    [新しいリフレッシュトークン] ' + JSON.stringify(tokens.refresh_token));
              outputCh.appendLine('    [新しい有効期限] ' + JSON.stringify(tokens.expiry_date));
              resolve();
            } catch (err: any) {
              res.end('Authentication failed!');
              outputCh.appendLine('Authentication failed: ' + err.message);
              reject(new Error('Authentication failed: ' + err.message));
            }
          } else {
            res.end('No code found in the callback URL.');
            outputCh.appendLine('No code found in the callback URL.');
            reject(new Error('No code found in the callback URL.'));
          }
          server.close();
          outputCh.appendLine('Closing the server...');
        }
      }).listen(3000, () => {
        outputCh.appendLine('Server is running on http://localhost:3000');
      });
    });
  }

  /**
   * トークンのリフレッシュを行う
   */
  public static async refreshToken(
    outputCh: vscode.OutputChannel,
    context: vscode.ExtensionContext
  ): Promise<Auth.OAuth2Client> {
    const oauth2Client = await this.getOAuth2Client(outputCh, context.secrets);
    const tokens: GoogleTokens | undefined = context.globalState.get('oauthTokens');
    
    // トークンが存在し、認証情報がセットされていない場合、認証情報をセットする
    if (tokens && !this.isCredentialsSet(oauth2Client)) {
      oauth2Client.setCredentials(tokens);
    }
    
    // 認証情報が存在しない場合、認証を行う
    if (!this.isAuthenticated(oauth2Client.credentials)) {
      outputCh.appendLine('Authenticating...');
      if (await this.isSetClientIdSecret(outputCh, context.secrets)) {
        await this.authenticate(outputCh, context);
        return this.refreshToken(outputCh, context);
      } else {
        throw new Error('OAuth 2.0 クライアント情報の取得に失敗しました。[MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド実行して情報を入力してください。');
      }
    } else if (this.isTokenExpired(oauth2Client.credentials)) {
      // もし、有効期限が切れていた場合、リフレッシュする
      try {
        outputCh.appendLine('    [有効期限切れ]  Refreshing token...' + JSON.stringify(oauth2Client.credentials));
        outputCh.appendLine('Refreshing token...');
        const {credentials} = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        context.globalState.update('oauthTokens', credentials);
        outputCh.appendLine('    [新しいアクセストークン] ' + JSON.stringify(oauth2Client.credentials.access_token));
        outputCh.appendLine('    [新しいリフレッシュトークン] ' + JSON.stringify(oauth2Client.credentials.refresh_token));
        outputCh.appendLine('    [新しい有効期限] ' + JSON.stringify(oauth2Client.credentials.expiry_date));
      } catch (error: any) {
        if (error.message === 'invalid_grant') {
          // リフレッシュトークンが無効な場合、再認証を行う
          outputCh.appendLine('    [リフレッシュトークンが無効]  再認証してください...');
          await this.authenticate(outputCh, context);
          return this.refreshToken(outputCh, context);
        } else {
          outputCh.appendLine('Failed to refresh token: ' + error.message);
          vscode.window.showErrorMessage('Failed to refresh token: ' + error.message);
          throw new Error('Failed to refresh token: ' + error.message + ':' + error.code);
        }
      }
    }
    
    return oauth2Client;
  }
}
