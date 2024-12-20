interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}
interface ErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

interface AlbumsResponse {
  albums: Album[];
  nextPageToken?: string;
}

interface Album {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl: string;
  coverPhotoMediaItemId: string;
}

interface MediaItemsResponse {
  mediaItems: MediaItem[];
  nextPageToken?: string;
}

interface MediaItem {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
  };
}
