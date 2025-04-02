import * as vscode from 'vscode';
import { Auth } from 'googleapis';
import { fetchAlbums, searchMediaItems } from '../api/photoslibrary';
import { AuthService } from './authService';

/**
 * Google Photos関連のサービスクラス
 */
export class GooglePhotosService {
  /**
   * アルバム一覧を取得する
   */
  public static async getAlbums(
    outputCh: vscode.OutputChannel, 
    context: vscode.ExtensionContext
  ): Promise<Album[]> {
    const oauth2Client = await AuthService.refreshToken(outputCh, context);
    try {
      const accessToken = oauth2Client.credentials.access_token || '';
      const albumsResponse = await fetchAlbums(accessToken);
      return albumsResponse.albums;
    } catch (err: any) {
      console.error('Failed to fetch albums:', err);
      throw new Error('getAlbums - Authentication required.' + err.message + ':' + err.code);
    }
  }

  /**
   * 指定されたタイトルのアルバム ID を取得する
   */
  public static async findAlbumIdByTitle(
    outputCh: vscode.OutputChannel, 
    context: vscode.ExtensionContext, 
    title: string
  ): Promise<string | null> {
    const oauth2Client = await AuthService.refreshToken(outputCh, context);
    outputCh.appendLine('[findAlbumIdByTitle]Searching for albums...title:' + title);
    outputCh.appendLine('[findAlbumIdByTitle]Searching for albums...Access Token:' + oauth2Client.credentials.access_token);
    const accessToken = oauth2Client.credentials.access_token || '';
    try {
      const albumsResponse = await fetchAlbums(accessToken);
      return this.processAlbumsResponse(outputCh, albumsResponse, title);
    } catch (err: any) {
      if (err.message === 'UNAUTHENTICATED') {
        // 認証が必要な場合、再認証を行う
        await AuthService.authenticate(outputCh, context);
        return this.findAlbumIdByTitle(outputCh, context, title);
      } else {
        outputCh.appendLine('[findAlbumIdByTitle]Failed to search albums.' + err.message);
        throw new Error('[findAlbumIdByTitle]Failed to search albums.' + err.message);
      }
    }
  }

  /**
   * アルバム応答からタイトルに一致するアルバム ID を探す
   */
  private static processAlbumsResponse(
    outputCh: vscode.OutputChannel, 
    albumsResponse: AlbumsResponse, 
    title: string
  ): string | null {
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

  /**
   * 指定されたアルバムIDからメディアアイテムを取得する
   */
  public static async findMediaItem(
    outputCh: vscode.OutputChannel, 
    context: vscode.ExtensionContext, 
    albumId: string
  ): Promise<string[]> {
    const oauth2Client = await AuthService.refreshToken(outputCh, context);
    const accessToken = oauth2Client.credentials.access_token || '';
    try {
      const mediaItemsResponse = await searchMediaItems(accessToken, albumId);
      return this.getMediaItemBaseUrls(mediaItemsResponse);
    } catch (err: any) {
      if (err.message === 'UNAUTHENTICATED') {
        // 認証が必要な場合、再認証を行う
        await AuthService.authenticate(outputCh, context);
        return this.findMediaItem(outputCh, context, albumId);
      } else {
        outputCh.appendLine('Failed to search media items.'+ err.message );
        throw new Error('[findMediaItem] Failed to search media items.'+ err.message);
      }
    }
  }

  /**
   * メディアアイテムからベースURLのリストを取得する
   */
  private static getMediaItemBaseUrls(mediaItemsResponse: MediaItemsResponse): string[] {
    const mediaItems = mediaItemsResponse.mediaItems;
    if (!mediaItems || mediaItems.length === 0) {
      // メディアアイテムが存在しない場合
      return [];
    }
    return mediaItems.map(item => item.baseUrl);
  }
}

// 後方互換性のための関数エクスポート
export const authenticate = AuthService.authenticate;
export const refreshToken = AuthService.refreshToken;
export const getAlbums = GooglePhotosService.getAlbums;
export const findAlbumIdByTitle = GooglePhotosService.findAlbumIdByTitle;
export const findMediaItem = GooglePhotosService.findMediaItem;
