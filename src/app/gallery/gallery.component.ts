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
  artworks: Artwork[] = [];
  searchQuery: string = '';
  searchSubject = new Subject<string>();
  isLoading: boolean = true;
  page: number = 1;
  selectedArt: Artwork | null = null;

  private iconicTerms = ['Vincent van Gogh', 'Claude Monet', 'Rembrandt', 'Pierre-Auguste Renoir', 'Edgar Degas', 'Paul Cézanne', 'Impressionism', 'Renaissance', 'Baroque', 'Post-Impressionism', 'Masterpiece', 'Classic Painting', 'Oil on canvas', 'Portrait', 'Landscape'];
  private currentTerm: string = '';

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
    this.currentTerm = this.iconicTerms[Math.floor(Math.random() * this.iconicTerms.length)];
    const randomPage = Math.floor(Math.random() * 5) + 1;
    this.artService.searchArtworks(this.currentTerm, randomPage, 30).subscribe(res => {
      this.artworks = this.shuffle(res.data);
      this.isLoading = false;
    });
  }

  searchArtworks(query: string) {
    this.isLoading = true;
    this.artService.searchArtworks(query, this.page, 30).subscribe(res => {
      this.artworks = res.data;
      this.isLoading = false;
    });
  }

  loadMore() {
    this.page++;
    if (this.searchQuery.trim() === '') {
      this.isLoading = true;
      const nextTerm = this.iconicTerms[Math.floor(Math.random() * this.iconicTerms.length)];
      const randomPage = Math.floor(Math.random() * 5) + 1;
      this.artService.searchArtworks(nextTerm, randomPage, 30).subscribe(res => {
        this.artworks = [...this.artworks, ...this.shuffle(res.data)];
        this.isLoading = false;
      });
    } else {
      this.isLoading = true;
      this.artService.searchArtworks(this.searchQuery, this.page, 30).subscribe(res => {
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
