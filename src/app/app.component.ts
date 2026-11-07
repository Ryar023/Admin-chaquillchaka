import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, skip } from 'rxjs';
import { AccessibilitySpeechComponent } from './accessibility-speech.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AccessibilitySpeechComponent],
  template: `
    <nav aria-label="Enlaces de salto">
      <a class="skip-link" href="#" (click)="skipToMain($event)">Saltar al contenido principal</a>
    </nav>
    <aside class="accessibility-tools" aria-label="Herramientas de accesibilidad" (keydown.escape)="closeAccessibility($event, accessibilityTrigger)">
      <button
        #accessibilityTrigger
        class="accessibility-trigger"
        type="button"
        aria-label="Accesibilidad"
        aria-controls="accessibility-panel"
        [attr.aria-expanded]="accessibilityOpen"
        (click)="accessibilityOpen = !accessibilityOpen">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"></circle><path d="M4 8l8 2 8-2M12 10v5m-4 6 4-6 4 6"></path></svg>
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
        <button class="accessibility-option" type="button" [attr.aria-pressed]="distinguishStates" (click)="toggleDistinguishStates()">
          Distinguir enlaces y estados: {{ distinguishStates ? 'activado' : 'desactivado' }}
        </button>
        <button class="accessibility-option" type="button" [attr.aria-pressed]="highlightLinks" (click)="toggleHighlightLinks()">
          Resaltar enlaces: {{ highlightLinks ? 'activado' : 'desactivado' }}
        </button>
        <button class="accessibility-option" type="button" [attr.aria-pressed]="textSpacing" (click)="toggleTextSpacing()">
          Espaciado de texto: {{ textSpacing ? 'activado' : 'desactivado' }}
        </button>
        <button class="accessibility-option" type="button" [attr.aria-pressed]="accessibleFont" (click)="toggleAccessibleFont()">
          Fuente sans-serif: {{ accessibleFont ? 'activada' : 'desactivada' }}
        </button>
        <p>Ayuda a distinguir enlaces y estados sin depender solo del color; puede ser útil para personas con daltonismo.</p>
        <app-accessibility-speech></app-accessibility-speech>
        <button class="accessibility-reset" type="button" (click)="resetAccessibility()">Restablecer opciones</button>
        <p *ngIf="storageError" role="alert">{{ storageError }}</p>
        <p>El lector de pantalla y la lupa del dispositivo se activan desde sus propios ajustes.</p>
      </section>
    </aside>
    <div class="sr-only" role="status" aria-live="polite">{{ routeAnnouncement }}</div>
    <router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  @ViewChild(AccessibilitySpeechComponent) private speech?: AccessibilitySpeechComponent;
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  routeAnnouncement = '';
  accessibilityOpen = false;
  fontScale = 100;
  highContrast = false;
  reducedMotion = false;
  distinguishStates = false;
  highlightLinks = false;
  textSpacing = false;
  accessibleFont = false;
  storageError = '';

  ngOnInit(): void {
    try {
      const savedScale = Number(localStorage.getItem('chaquill-a11y-font-scale'));
      if ([100, 115, 130, 150, 175, 200].includes(savedScale)) this.fontScale = savedScale;
      this.highContrast = localStorage.getItem('chaquill-a11y-high-contrast') === 'true';
      this.reducedMotion = localStorage.getItem('chaquill-a11y-reduced-motion') === 'true';
      this.distinguishStates = localStorage.getItem('chaquill-a11y-distinguish-states') === 'true';
      this.highlightLinks = localStorage.getItem('chaquill-a11y-highlight-links') === 'true';
      this.textSpacing = localStorage.getItem('chaquill-a11y-text-spacing') === 'true';
      this.accessibleFont = localStorage.getItem('chaquill-a11y-accessible-font') === 'true';
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

  toggleDistinguishStates(): void {
    this.distinguishStates = !this.distinguishStates;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  toggleHighlightLinks(): void {
    this.highlightLinks = !this.highlightLinks;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  toggleTextSpacing(): void {
    this.textSpacing = !this.textSpacing;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  toggleAccessibleFont(): void {
    this.accessibleFont = !this.accessibleFont;
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  resetAccessibility(): void {
    this.fontScale = 100;
    this.highContrast = false;
    this.reducedMotion = false;
    this.distinguishStates = false;
    this.highlightLinks = false;
    this.textSpacing = false;
    this.accessibleFont = false;
    this.speech?.reset();
    this.saveAccessibility();
    this.applyAccessibilitySettings();
  }

  private saveAccessibility(): void {
    try {
      localStorage.setItem('chaquill-a11y-font-scale', String(this.fontScale));
      localStorage.setItem('chaquill-a11y-high-contrast', String(this.highContrast));
      localStorage.setItem('chaquill-a11y-reduced-motion', String(this.reducedMotion));
      localStorage.setItem('chaquill-a11y-distinguish-states', String(this.distinguishStates));
      localStorage.setItem('chaquill-a11y-highlight-links', String(this.highlightLinks));
      localStorage.setItem('chaquill-a11y-text-spacing', String(this.textSpacing));
      localStorage.setItem('chaquill-a11y-accessible-font', String(this.accessibleFont));
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
    root.classList.toggle('a11y-distinguish-states', this.distinguishStates);
    document.body.classList.toggle('a11y-highlight-links', this.highlightLinks);
    document.body.classList.toggle('a11y-text-spacing', this.textSpacing);
    document.body.classList.toggle('a11y-accessible-font', this.accessibleFont);
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
