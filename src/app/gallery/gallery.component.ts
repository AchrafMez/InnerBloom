import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ArtService, Artwork } from '../services/art.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent implements OnInit {
  private readonly pageSize = 15;

  artworks: Artwork[] = [];
  searchQuery: string = '';
  searchSubject = new Subject<string>();
  isLoading: boolean = true;
  page: number = 1;
  selectedArt: Artwork | null = null;

  constructor(
    private artService: ArtService,
    private route: ActivatedRoute
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(query => {
      this.page = 1;
      if (query.trim() === '') {
        this.loadArtworks();
      } else {
        this.searchArtworks(query);
      }
    });
  }

  ngOnInit(): void {
    this.loadArtworks();
    this.openArtworkFromRoute();
  }

  private openArtworkFromRoute() {
    const artworkId = Number(this.route.snapshot.queryParamMap.get('artwork'));

    if (!artworkId) {
      return;
    }

    this.artService.getArtwork(artworkId).subscribe(art => {
      this.selectedArt = art;
      this.artworks = [art, ...this.artworks.filter(item => item.id !== art.id)];
    });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  private shuffle(arr: Artwork[]): Artwork[] {
    return arr.sort(() => 0.5 - Math.random());
  }

  loadArtworks() {
    this.isLoading = true;
    this.artService.getPaintingArtworks(this.page, this.pageSize).subscribe(res => {
      this.artworks = res.data;
      this.isLoading = false;
    });
  }

  searchArtworks(query: string) {
    this.isLoading = true;
    this.artService.searchArtworks(query, this.page, this.pageSize).subscribe(res => {
      this.artworks = res.data;
      this.isLoading = false;
    });
  }

  loadMore() {
    this.page++;
    this.isLoading = true;

    if (this.searchQuery.trim() === '') {
      this.artService.getPaintingArtworks(this.page, this.pageSize).subscribe(res => {
        this.artworks = [...this.artworks, ...res.data];
        this.isLoading = false;
      });
    } else {
      this.artService.searchArtworks(this.searchQuery, this.page, this.pageSize).subscribe(res => {
        this.artworks = [...this.artworks, ...this.shuffle(res.data)];
        this.isLoading = false;
      });
    }
  }

  openModal(art: Artwork) {
    this.selectedArt = art;
  }

  closeModal() {
    this.selectedArt = null;
  }

  getWikiLink(artistName: string): string {
    if (!artistName) return '';
    // Basic formatting for a Wikipedia search query
    return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(artistName)}`;
  }
}
