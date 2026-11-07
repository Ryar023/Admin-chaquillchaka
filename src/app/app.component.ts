import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, skip } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <nav aria-label="Enlaces de salto">
      <a class="skip-link" href="#" (click)="skipToMain($event)">Saltar al contenido principal</a>
    </nav>
    <aside class="accessibility-tools" aria-label="Herramientas de accesibilidad" (keydown.escape)="closeAccessibility($event, accessibilityTrigger)">
      <button
        #accessibilityTrigger
        class="accessibility-trigger"
        type="button"
        aria-controls="accessibility-panel"
        [attr.aria-expanded]="accessibilityOpen"
        (click)="accessibilityOpen = !accessibilityOpen">
        Accesibilidad
      </button>
      <section [hidden]="!accessibilityOpen" id="accessibility-panel" class="accessibility-panel" aria-labelledby="accessibility-title">
        <h2 id="accessibility-title">Opciones de accesibilidad</h2>
        <div class="text-size-control">
          <span id="text-size-label">Ampliación de página: {{ fontScale }}%</span>
          <div class="text-size-buttons" role="group" aria-labelledby="text-size-label">
            <button type="button" aria-label="Disminuir ampliación" [disabled]="fontScale <= 100" (click)="changeFontScale(-1)">A−</button>
            <button type="button" aria-label="Aumentar ampliación" [disabled]="fontScale >= 200" (click)="changeFontScale(1)">A+</button>
          </div>
        </div>
        <button class="accessibility-option" type="button" [attr.aria-pressed]="highContrast" (click)="toggleHighContrast()">
          Contraste reforzado: {{ highContrast ? 'activado' : 'desactivado' }}
        </button>
        <button class="accessibility-option" type="button" [attr.aria-pressed]="reducedMotion" (click)="toggleReducedMotion()">
          Reducir movimiento: {{ reducedMotion ? 'activado' : 'desactivado' }}
        </button>
        <button class="accessibility-reset" type="button" (click)="resetAccessibility()">Restablecer opciones</button>
        <p *ngIf="storageError" role="alert">{{ storageError }}</p>
        <p>Las ayudas del sistema, como el lector de pantalla y la lupa, se activan desde los ajustes del dispositivo o del navegador. Una página web no puede abrirlos ni activarlos por sí sola.</p>
      </section>
    </aside>
    <div class="sr-only" role="status" aria-live="polite">{{ routeAnnouncement }}</div>
    <router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  routeAnnouncement = '';
  accessibilityOpen = false;
  fontScale = 100;
  highContrast = false;
  reducedMotion = false;
  storageError = '';

  ngOnInit(): void {
    try {
      const savedScale = Number(localStorage.getItem('chaquill-a11y-font-scale'));
      if ([100, 115, 130, 150, 175, 200].includes(savedScale)) this.fontScale = savedScale;
      this.highContrast = localStorage.getItem('chaquill-a11y-high-contrast') === 'true';
      this.reducedMotion = localStorage.getItem('chaquill-a11y-reduced-motion') === 'true';
    } catch (error) {
      this.reportStorageError(error);
    }
    this.applyAccessibilitySettings();

    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), skip(1)).subscribe(() => {
      setTimeout(() => {
        this.routeAnnouncement = `Página cargada: ${this.title.getTitle()}`;
        this.focusMain();
      });
    });
  }

  closeAccessibility(event: Event, trigger: HTMLButtonElement): void {
    if (!this.accessibilityOpen) return;
    event.stopPropagation();
    this.accessibilityOpen = false;
    trigger.focus();
  }

  changeFontScale(direction: -1 | 1): void {
    const scales = [100, 115, 130, 150, 175, 200];
    const currentIndex = scales.indexOf(this.fontScale);
    this.fontScale = scales[Math.max(0, Math.min(scales.length - 1, currentIndex + direction))];
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  toggleHighContrast(): void {
    this.highContrast = !this.highContrast;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  toggleReducedMotion(): void {
    this.reducedMotion = !this.reducedMotion;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  resetAccessibility(): void {
    this.fontScale = 100;
    this.highContrast = false;
    this.reducedMotion = false;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  private saveAccessibility(): void {
    try {
      localStorage.setItem('chaquill-a11y-font-scale', String(this.fontScale));
      localStorage.setItem('chaquill-a11y-high-contrast', String(this.highContrast));
      localStorage.setItem('chaquill-a11y-reduced-motion', String(this.reducedMotion));
      this.storageError = '';
    } catch (error) {
      this.reportStorageError(error);
    }
  }

  private reportStorageError(error: unknown): void {
    console.error('No se pudieron guardar o cargar las preferencias de accesibilidad.', error);
    this.storageError = 'No se pudieron guardar las preferencias en este navegador. Se aplicarán solo durante esta visita.';
  }

  private applyAccessibilitySettings(): void {
    const root = document.documentElement;
    root.classList.toggle('a11y-text-scale-115', this.fontScale === 115);
    root.classList.toggle('a11y-text-scale-130', this.fontScale === 130);
    root.classList.toggle('a11y-text-scale-150', this.fontScale === 150);
    root.classList.toggle('a11y-text-scale-175', this.fontScale === 175);
    root.classList.toggle('a11y-text-scale-200', this.fontScale === 200);
    root.classList.toggle('a11y-high-contrast', this.highContrast);
    root.classList.toggle('a11y-reduced-motion', this.reducedMotion);
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
