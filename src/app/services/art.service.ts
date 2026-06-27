import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface Artwork {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  medium_display: string;
  image_id: string;
  imageUrl?: string;
  fullImageUrl?: string;
  description?: string;
  thumbnail?: {
    lqip?: string;
    width?: number;
    height?: number;
    alt_text?: string;
  };
  hasImageError?: boolean;
}

export interface ArtResponse {
  data: Artwork[];
  pagination: any;
}

interface MetArtwork {
  objectID: number;
  title: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  objectDate: string;
  medium: string;
  primaryImage: string;
  primaryImageSmall: string;
}

interface CuratedArtwork {
  id: number;
  terms: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArtService {
  private baseUrl = 'https://collectionapi.metmuseum.org/public/collection/v1';
  private artworkCache = new Map<number, Observable<Artwork | null>>();
  private shuffledMasterpieceIds: number[] = [];
  private readonly curatedMasterpieces: CuratedArtwork[] = [
    { id: 436535, terms: 'vincent van gogh wheat field with cypresses dutch post impressionism masterpiece' },
    { id: 436528, terms: 'vincent van gogh irises dutch post impressionism masterpiece' },
    { id: 436532, terms: 'vincent van gogh self portrait dutch post impressionism masterpiece' },
    { id: 459123, terms: 'vincent van gogh madame roulin dutch post impressionism masterpiece' },
    { id: 437127, terms: 'claude monet bridge over a pond of water lilies french impressionism masterpiece' },
    { id: 437133, terms: 'claude monet garden at sainte adresse french impressionism masterpiece' },
    { id: 437135, terms: 'claude monet la grenouillere french impressionism masterpiece' },
    { id: 438817, terms: 'edgar degas the dance class french impressionism masterpiece' },
    { id: 436122, terms: 'edgar degas collector of prints french impressionism masterpiece' },
    { id: 459110, terms: 'auguste renoir young girl bathing french impressionism masterpiece' },
    { id: 438011, terms: 'auguste renoir eugene murer french impressionism masterpiece' },
    { id: 435868, terms: 'paul cezanne the card players french post impressionism masterpiece' },
    { id: 435882, terms: 'paul cezanne still life apples french post impressionism masterpiece' },
    { id: 437397, terms: 'rembrandt self portrait dutch old master baroque masterpiece' },
    { id: 437406, terms: 'rembrandt portrait old master dutch baroque masterpiece' },
    { id: 437392, terms: 'rembrandt herman doomer old master dutch baroque masterpiece' },
    { id: 437372, terms: 'raphael madonna and child italian renaissance masterpiece' },
    { id: 437373, terms: 'raphael giuliano de medici italian renaissance masterpiece' },
    { id: 437827, terms: 'titian venus and lute player italian venetian renaissance masterpiece' },
    { id: 437826, terms: 'titian venus and adonis italian venetian renaissance masterpiece' },
    { id: 437986, terms: 'caravaggio denial of saint peter italian baroque masterpiece' },
    { id: 436570, terms: 'el greco adoration of the shepherds spanish old master masterpiece' },
    { id: 436575, terms: 'el greco view of toledo spanish old master masterpiece' },
    { id: 436106, terms: 'jacques louis david lavoisier french neoclassical masterpiece' },
    { id: 436105, terms: 'jacques louis david death of socrates french neoclassical masterpiece' },
    { id: 12127, terms: 'john singer sargent madame x portrait masterpiece' },
    { id: 436944, terms: 'edouard manet spanish singer french modern masterpiece' },
    { id: 436964, terms: 'edouard manet young lady french modern masterpiece' },
    { id: 437881, terms: 'johannes vermeer young woman with a water pitcher dutch old master masterpiece' },
    { id: 437878, terms: 'johannes vermeer maid asleep dutch old master masterpiece' },
    { id: 437530, terms: 'peter paul rubens portrait old master flemish baroque masterpiece' },
    { id: 437534, terms: 'peter paul rubens triumph of henry iv old master baroque masterpiece' },
    { id: 435729, terms: 'sandro botticelli saint zenobius italian renaissance masterpiece' },
    { id: 435728, terms: 'sandro botticelli saint jerome italian renaissance masterpiece' },
    { id: 436544, terms: 'francisco goya portrait spanish old master masterpiece' },
    { id: 436546, terms: 'francisco goya pepito spanish old master masterpiece' },
    { id: 459106, terms: 'jean auguste dominique ingres princesse de broglie french masterpiece' },
    { id: 436703, terms: 'jean auguste dominique ingres madame leblanc french masterpiece' },
    { id: 247010, terms: 'roman wall painting boscoreale italy ancient roman masterpiece' },
    { id: 250942, terms: 'roman wall painting boscotrecase italy ancient roman masterpiece' },
    { id: 436918, terms: 'lorenzo lotto venus and cupid italian renaissance masterpiece' },
    { id: 437925, terms: 'antoine watteau french comedians french rococo masterpiece' }
  ];

  constructor(private http: HttpClient) { }

  getArtworks(page: number = 1, limit: number = 20): Observable<ArtResponse> {
    return this.getPaintingArtworks(page, limit);
  }

  getPaintingArtworks(page: number = 1, limit: number = 20): Observable<ArtResponse> {
    return this.fetchCuratedArtworks(page, limit);
  }

  searchArtworks(query: string, page: number = 1, limit: number = 20): Observable<ArtResponse> {
    return this.fetchCuratedArtworks(page, limit, query);
  }

  getArtwork(id: number): Observable<Artwork> {
    return this.http.get<MetArtwork>(`${this.baseUrl}/objects/${id}`).pipe(
      map(art => this.normalizeMetArtwork(art))
    );
  }

  private fetchCuratedArtworks(page: number, limit: number, query: string = ''): Observable<ArtResponse> {
    const normalizedQuery = query.trim().toLowerCase();
    const collection = normalizedQuery
      ? this.curatedMasterpieces.filter(art => art.terms.includes(normalizedQuery))
      : this.getShuffledMasterpieces();
    const pageIDs = collection.slice((page - 1) * limit, page * limit).map(art => art.id);

    if (pageIDs.length === 0) {
      return of(this.createResponse([], collection.length, page, limit));
    }

    return forkJoin(pageIDs.map(id => this.getMetArtwork(id))).pipe(
      map(data => this.createResponse(
        data.filter((art): art is Artwork => Boolean(art?.imageUrl)),
        collection.length,
        page,
        limit
      ))
    );
  }

  private getMetArtwork(id: number): Observable<Artwork | null> {
    const cachedArtwork = this.artworkCache.get(id);

    if (cachedArtwork) {
      return cachedArtwork;
    }

    const request = this.http.get<MetArtwork>(`${this.baseUrl}/objects/${id}`).pipe(
      map(art => this.normalizeMetArtwork(art)),
      catchError(() => of(null)),
      shareReplay(1)
    );

    this.artworkCache.set(id, request);
    return request;
  }

  private getShuffledMasterpieces(): CuratedArtwork[] {
    if (this.shuffledMasterpieceIds.length === 0) {
      this.shuffledMasterpieceIds = this.shuffle(this.curatedMasterpieces.map(art => art.id));
    }

    return this.shuffledMasterpieceIds
      .map(id => this.curatedMasterpieces.find(art => art.id === id))
      .filter((art): art is CuratedArtwork => Boolean(art));
  }

  private createResponse(data: Artwork[], total: number, page: number, limit: number): ArtResponse {
    return {
      data,
      pagination: {
        total,
        limit,
        current_page: page,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => 0.5 - Math.random());
  }

  private normalizeMetArtwork(art: MetArtwork): Artwork {
    return {
      id: art.objectID,
      title: art.title || 'Untitled',
      artist_display: [art.artistDisplayName, art.artistDisplayBio].filter(Boolean).join(' '),
      date_display: art.objectDate,
      medium_display: art.medium,
      image_id: String(art.objectID),
      imageUrl: art.primaryImageSmall || art.primaryImage,
      fullImageUrl: art.primaryImage || art.primaryImageSmall
    };
  }
}
