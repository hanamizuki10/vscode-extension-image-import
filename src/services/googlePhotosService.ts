import * as vscode from 'vscode';
import { google, Auth } from 'googleapis';
import open from 'open';
import * as http from 'http';
import * as url from 'url';
import { SCOPES, fetchAlbums, searchMediaItems } from '../api/photoslibrary';

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// クライアントIDとクライアントシークレットが設定されているか確認する
export async function isSetClientIdSecret(outputCh: vscode.OutputChannel, secrets: vscode.SecretStorage): Promise<boolean> {
  const clientId = await secrets.get('CLIENT_ID');
  const clientSecret = await secrets.get('CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return false; // 設定されていない
  }
  return true;
}
// 認証済みか確認する
export function isAuthenticated(tokens: Auth.Credentials): boolean {
  if (!tokens) {
    return false; // 認証されていない
  }
  return true;
}
// トークンの有効期限が切れているか確認する
export function isTokenExpired(tokens: Auth.Credentials): boolean {
  if (tokens && tokens.expiry_date && tokens.expiry_date < Date.now()) {
    return true;  // トークンの有効期限が切れている
  }
  return false;
}
// OAuth2 クライアントに認証情報がセットされているか確認する
export function isCredentialsSet(oauth2Client: Auth.OAuth2Client): boolean {
  if (!oauth2Client.credentials || Object.keys(oauth2Client.credentials).length  === 0) {
    return false; // 認証情報がセットされていない
  }
  return true;
}

// OAuth2 クライアントを取得する
export async function getOAuth2Client(outputCh: vscode.OutputChannel, secrets: vscode.SecretStorage): Promise<Auth.OAuth2Client> {
  // SecretStorageから各秘密情報を非同期で取得
  // NOTE: src/secretPanel.ts で指定された値を利用
  const clientId = await secrets.get('CLIENT_ID');
  const clientSecret = await secrets.get('CLIENT_SECRET');
  // 環境変数が正しく設定されていない場合はエラーを投げる
  if (!clientId || !clientSecret) {
    throw new Error('OAuth 2.0 クライアント情報の取得に失敗しました。[MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド実行して情報を入力してください。');
  }

  // OAuth2クライアントの生成
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  return oauth2Client;
}

// 認証
export async function authenticate(
  outputCh: vscode.OutputChannel,
  context: vscode.ExtensionContext
): Promise<void> {
  const oauth2Client = await getOAuth2Client(outputCh, context.secrets);
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

// トークンのリフレッシュ
export async function refreshToken(
  outputCh: vscode.OutputChannel,
  context: vscode.ExtensionContext
): Promise<Auth.OAuth2Client> {
  const oauth2Client = await getOAuth2Client(outputCh, context.secrets);
  const tokens: GoogleTokens | undefined = context.globalState.get('oauthTokens');
  if (tokens && !isCredentialsSet(oauth2Client)) {
    oauth2Client.setCredentials(tokens);
  }
  if (!isAuthenticated(oauth2Client.credentials)) {
    // もし、認証情報が存在しない場合、認証を行う
    outputCh.appendLine('Authenticating...');
    if (await isSetClientIdSecret(outputCh, context.secrets)) {
      await authenticate(outputCh, context);
      return refreshToken(outputCh, context);
    } else {
      throw new Error('OAuth 2.0 クライアント情報の取得に失敗しました。[MyLoveCat: クライアント ID とクライアント シークレットの設定] コマンド実行して情報を入力してください。');
    }
  } else if (isTokenExpired(oauth2Client.credentials)) {
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
        await authenticate(outputCh, context);
        return refreshToken(outputCh, context);
      } else {
        outputCh.appendLine('Failed to refresh token: ' + error.message);
        vscode.window.showErrorMessage('Failed to refresh token: ' + error.message);
        throw new Error('Failed to refresh token: ' + error.message + ':' + error.code);
      }
    }
  }
  return oauth2Client;
}

export async function getAlbums(outputCh: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<Album[]> {
  const oauth2Client = await refreshToken(outputCh, context);
  try {
    const accessToken = oauth2Client.credentials.access_token || '';
    const albumsResponse = await fetchAlbums(accessToken);
    return albumsResponse.albums;
  } catch (err: any) {
    console.error('Failed to fetch albums:', err);
    throw new Error('getAlbums - Authentication required.' + err.message + ':' + err.code);
  }
}

// 指定されたタイトルのアルバム ID を取得する関数
export async function findAlbumIdByTitle(outputCh: vscode.OutputChannel, context: vscode.ExtensionContext, title: string): Promise<string | null> {
  const oauth2Client = await refreshToken(outputCh, context);
  outputCh.appendLine('[findAlbumIdByTitle]Searching for albums...title:' + title);
  outputCh.appendLine('[findAlbumIdByTitle]Searching for albums...Access Token:' + oauth2Client.credentials.access_token);
  const accessToken = oauth2Client.credentials.access_token || '';
  try {
    const albumsResponse = await fetchAlbums(accessToken);
    return processAlbumsResponse(outputCh, albumsResponse, title);
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      // 認証が必要な場合、再認証を行う
      await authenticate(outputCh, context);
      return findAlbumIdByTitle(outputCh, context, title);
    } else {
      outputCh.appendLine('[findAlbumIdByTitle]Failed to search albums.' + err.message);
      throw new Error('[findAlbumIdByTitle]Failed to search albums.' + err.message);
    }
  }
}

// アルバム応答からタイトルに一致するアルバム ID を探す関数
function processAlbumsResponse(outputCh: vscode.OutputChannel, albumsResponse: AlbumsResponse, title: string): string | null {
  albumsResponse.albums.forEach(album => {
    console.log(`Album title: ${album.title}`);
    outputCh.appendLine(`Album title: ${album.title}`);
  });
  const album = albumsResponse.albums.find(album => album.title.toLowerCase() === title.toLowerCase());
  if (album) {
    outputCh.appendLine(`Found album: ${album.title} (ID: ${album.id})`);
    console.log(`Found album: ${album.title} (ID: ${album.id})`);
    return album.id;
  } else {
    console.log(`No album found with the title: '${title}'`);
    outputCh.appendLine(`No album found with the title: '${title}'`);
    return null;
  }
}

// 指定されたタイトルのアルバム ID を取得する関数
export async function findMediaItem(outputCh: vscode.OutputChannel, context: vscode.ExtensionContext, albumId: string): Promise<string[]> {
  const oauth2Client = await refreshToken(outputCh, context);
  const accessToken = oauth2Client.credentials.access_token || '';
  try {
    const mediaItemsResponse = await searchMediaItems(accessToken, albumId);
    return getRandomMediaItem(mediaItemsResponse);
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      // 認証が必要な場合、再認証を行う
      await authenticate(outputCh, context);
      return findMediaItem(outputCh, context, albumId);
    } else {
      outputCh.appendLine('Failed to search media items.'+ err.message );
      throw new Error('[findMediaItem] Failed to search media items.'+ err.message);
    }
  }
}

function getRandomMediaItem(mediaItemsResponse: MediaItemsResponse): string[] {
  const mediaItems = mediaItemsResponse.mediaItems;
  if (!mediaItems || (mediaItems && mediaItems.length === 0)) {
    // メディアアイテムが存在しない場合
    return [];
  }
  return mediaItems.map(item => item.baseUrl);
}
