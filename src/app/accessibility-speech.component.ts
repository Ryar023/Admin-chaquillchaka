import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-accessibility-speech',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="accessibility-option" type="button" [disabled]="!supported"
      [attr.aria-pressed]="readFocus" (click)="toggleFocusReading()">
      Leer controles al usar Tab: {{ readFocus ? 'activado' : 'desactivado' }}
    </button>
    <p>Selecciona texto de la página y pulsa «Leer texto seleccionado». Con Tab se leen los nombres de los controles; no se leen los valores escritos.</p>
    <button class="accessibility-option" type="button" [disabled]="!supported" (click)="readSelection()">Leer texto seleccionado</button>
    <button class="accessibility-option" type="button" [disabled]="!supported" (click)="stop()">Detener lectura</button>
    <p *ngIf="!supported">La lectura en voz alta no está disponible en este navegador.</p>
    <p *ngIf="message" role="status">{{ message }}</p>
    <p>Esta lectura usa la voz del navegador y no reemplaza un lector de pantalla.</p>
  `
})
export class AccessibilitySpeechComponent implements OnDestroy {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  readFocus = false;
  message = '';
  private selectedText = '';
  private keyboardNavigation = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @HostListener('document:selectionchange')
  onSelectionChange(): void {
    const selection = document.getSelection();
    const anchor = selection?.anchorNode;
    const parent = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (parent?.closest('.accessibility-tools')) return;
    if (parent?.closest('input, textarea, [contenteditable="true"]')) {
      this.selectedText = '';
      return;
    }
    this.selectedText = selection?.toString().trim() ?? '';
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') this.keyboardNavigation = true;
  }

  @HostListener('document:pointerdown')
  onPointerDown(): void {
    this.keyboardNavigation = false;
  }

  @HostListener('document:focusin', ['$event'])
  onFocus(event: FocusEvent): void {
    if (!this.readFocus || !this.keyboardNavigation || !(event.target instanceof HTMLElement)) return;
    const element = event.target;
    if (element.closest('.accessibility-tools') || element.tagName === 'MAIN') return;
    const labelled = element.getAttribute('aria-labelledby');
    const labelText = labelled?.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ');
    const labels = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
      ? Array.from(element.labels ?? []).map(label => label.textContent?.trim() ?? '').join(' ') : '';
    const name = element.getAttribute('aria-label') || labelText || labels || element.textContent?.trim() || element.getAttribute('title');
    if (name) this.speak(name);
  }

  toggleFocusReading(): void {
    this.readFocus = !this.readFocus;
    document.documentElement.classList.toggle('a11y-reading-focus', this.readFocus);
    this.message = '';
    if (!this.readFocus) this.stop();
  }

  readSelection(): void {
    if (!this.selectedText) {
      this.message = 'Selecciona primero un texto de la página.';
      return;
    }
    this.speak(this.selectedText);
  }

  stop(): void {
    if (this.supported) window.speechSynthesis.cancel();
    this.message = '';
  }

  reset(): void {
    this.readFocus = false;
    document.documentElement.classList.remove('a11y-reading-focus');
    this.selectedText = '';
    this.stop();
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private speak(text: string): void {
    if (!this.supported) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      console.error('No se pudo reproducir la lectura.', event.error);
      this.message = 'No se pudo reproducir la lectura. Revisa la voz y el audio del dispositivo.';
      this.cdr.markForCheck();
    };
    window.speechSynthesis.speak(utterance);
  }
}
