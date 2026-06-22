import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Artwork {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  medium_display: string;
  image_id: string;
  imageUrl?: string;
  description?: string;
  hasImageError?: boolean;
}

export interface ArtResponse {
  data: Artwork[];
  pagination: any;
}

@Injectable({
  providedIn: 'root'
})
export class ArtService {
  private baseUrl = 'https://api.artic.edu/api/v1/artworks';
  private artworkFields = 'id,title,artist_display,date_display,medium_display,image_id,description';

  constructor(private http: HttpClient) { }

  getArtworks(page: number = 1, limit: number = 20): Observable<ArtResponse> {
    return this.http.get<ArtResponse>(`${this.baseUrl}?page=${page}&limit=${limit}&fields=${this.artworkFields}`).pipe(
      map(res => {
        res.data = res.data.map(art => ({
          ...art,
          imageUrl: art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg` : ''
        })).filter(art => art.imageUrl !== ''); // only return artworks with images
        return res;
      })
    );
  }

  searchArtworks(query: string, page: number = 1, limit: number = 20): Observable<ArtResponse> {
    return this.http.get<ArtResponse>(`${this.baseUrl}/search?q=${query}&page=${page}&limit=${limit}&fields=${this.artworkFields}`).pipe(
      map(res => {
        res.data = res.data.map(art => ({
          ...art,
          imageUrl: art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg` : ''
        })).filter(art => art.imageUrl !== '');
        return res;
      })
    );
  }

  getArtwork(id: number): Observable<Artwork> {
    return this.http.get<{ data: Artwork }>(`${this.baseUrl}/${id}?fields=${this.artworkFields}`).pipe(
      map(res => ({
        ...res.data,
        imageUrl: res.data.image_id ? `https://www.artic.edu/iiif/2/${res.data.image_id}/full/843,/0/default.jpg` : ''
      }))
    );
  }
}
