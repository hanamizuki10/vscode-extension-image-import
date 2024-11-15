import fetch from 'node-fetch';

export const SCOPES = ['https://www.googleapis.com/auth/photoslibrary.readonly'];

// APIリクエスを投げて、アルバム一覧を取得する
export async function fetchAlbums(accessToken: string): Promise<AlbumsResponse> {
  const response = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch albums');
  }
  const data = await response.json();
  return data as AlbumsResponse;
}

// APIリクエスを投げて、指定アルバム内の写真一覧を取得する
export async function searchMediaItems(accessToken: string, albumId: string): Promise<MediaItemsResponse> {
  const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      albumId: albumId,
      pageSize: 100
    })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch albums');
  }
  const data = await response.json();
  return data as MediaItemsResponse;
}
