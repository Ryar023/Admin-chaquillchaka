import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, skip } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <a class="skip-link" href="#" (click)="skipToMain($event)">Saltar al contenido principal</a>
    <div class="sr-only" role="status" aria-live="polite">{{ routeAnnouncement }}</div>
    <router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  routeAnnouncement = '';

  ngOnInit(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), skip(1)).subscribe(() => {
      setTimeout(() => {
        this.routeAnnouncement = `Página cargada: ${this.title.getTitle()}`;
        this.focusMain();
      });
    });
  }

  skipToMain(event: Event): void {
    event.preventDefault();
    this.focusMain();
  }

  private focusMain(): void {
    const main = document.querySelector('main') as HTMLElement | null;
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus();
  }
}
