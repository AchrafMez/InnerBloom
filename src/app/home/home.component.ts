import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArtService, Artwork } from '../services/art.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private static cachedArtworks: Artwork[] = [];
  private static cachedCurrentIndex: number = 0;

  artworks: Artwork[] = [];
  currentIndex: number = 0;

  constructor(private artService: ArtService) {}

  ngOnInit(): void {
    if (HomeComponent.cachedArtworks.length > 0) {
      this.artworks = HomeComponent.cachedArtworks;
      this.currentIndex = HomeComponent.cachedCurrentIndex;
      return;
    }

    const iconicTerms = ["Vincent van Gogh", "Claude Monet", "Rembrandt", "Pierre-Auguste Renoir", "Edgar Degas", "Paul Cézanne", "Impressionism", "Renaissance", "Baroque", "Post-Impressionism", "Masterpiece", "Classic Painting"];
    const randomTerm = iconicTerms[Math.floor(Math.random() * iconicTerms.length)];
    const randomPage = Math.floor(Math.random() * 3) + 1;

    this.artService.searchArtworks(randomTerm, randomPage, 20).subscribe(res => {
      // Shuffle the results to guarantee different order
      this.artworks = res.data.sort(() => 0.5 - Math.random());
      
      if (this.artworks.length > 0) {
        this.currentIndex = Math.floor(Math.random() * this.artworks.length);
        HomeComponent.cachedArtworks = this.artworks;
        HomeComponent.cachedCurrentIndex = this.currentIndex;
      }
    });
  }

  nextSlide() {
    if (this.artworks.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.artworks.length;
      HomeComponent.cachedCurrentIndex = this.currentIndex;
    }
  }

  prevSlide() {
    if (this.artworks.length > 0) {
      this.currentIndex = (this.currentIndex - 1 + this.artworks.length) % this.artworks.length;
      HomeComponent.cachedCurrentIndex = this.currentIndex;
    }
  }

  handleSlideClick(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const clickPosition = event.clientX - target.getBoundingClientRect().left;
    const isLeftSide = clickPosition < target.clientWidth / 2;

    if (isLeftSide) {
      this.prevSlide();
    } else {
      this.nextSlide();
    }
  }
}
