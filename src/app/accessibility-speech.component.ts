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
    <p>Selecciona texto de la página y pulsa «Leer texto seleccionado». Con Tab se leen y subrayan los controles y sus etiquetas; no se leen los valores escritos.</p>
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
  private selectedRange: Range | null = null;
  private keyboardNavigation = false;
  private interactionInTools = false;
  private focusedLabels: HTMLElement[] = [];
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @HostListener('document:selectionchange')
  onSelectionChange(): void {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!this.interactionInTools && !document.activeElement?.closest('.accessibility-tools')) {
        this.selectedText = '';
        this.selectedRange = null;
      }
      return;
    }
    const anchor = selection?.anchorNode;
    const parent = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (parent?.closest('.accessibility-tools')) return;
    if (parent?.closest('input, textarea, [contenteditable="true"]')) {
      this.selectedText = '';
      this.selectedRange = null;
      return;
    }
    this.selectedText = selection?.toString().trim() ?? '';
    this.selectedRange = this.selectedText && selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') this.keyboardNavigation = true;
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.keyboardNavigation = false;
    this.interactionInTools = event.target instanceof Element && !!event.target.closest('.accessibility-tools');
    if (!this.interactionInTools) {
      this.selectedText = '';
      this.selectedRange = null;
    }
  }

  @HostListener('document:focusin', ['$event'])
  onFocus(event: FocusEvent): void {
    this.clearFocusedLabels();
    if (!this.readFocus || !this.keyboardNavigation || !(event.target instanceof HTMLElement)) return;
    const element = event.target;
    if (element.closest('.accessibility-tools') || element.tagName === 'MAIN') return;
    const labelled = element.getAttribute('aria-labelledby');
    const labelledElements = labelled?.split(/\s+/).map(id => document.getElementById(id)).filter((item): item is HTMLElement => !!item) ?? [];
    const associatedLabels = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
      ? Array.from(element.labels ?? []) : [];
    this.focusedLabels = [...labelledElements, ...associatedLabels];
    this.focusedLabels.forEach(label => label.classList.add('a11y-reading-label'));
    const labelText = labelledElements.map(label => label.textContent?.trim() ?? '').join(' ');
    const labels = associatedLabels.map(label => label.textContent?.trim() ?? '').join(' ');
    const name = element.getAttribute('aria-label') || labelText || labels || element.textContent?.trim() || element.getAttribute('title');
    if (name) this.speak(name);
  }

  toggleFocusReading(): void {
    this.readFocus = !this.readFocus;
    document.documentElement.classList.toggle('a11y-reading-focus', this.readFocus);
    this.message = '';
    if (!this.readFocus) {
      this.clearFocusedLabels();
      this.stop();
    }
  }

  readSelection(): void {
    if (!this.selectedText) {
      this.message = 'Selecciona primero un texto de la página.';
      return;
    }
    if (!this.selectedRange?.startContainer.isConnected || !this.selectedRange.endContainer.isConnected) {
      this.message = 'El texto seleccionado ya no está disponible. Selecciónalo de nuevo.';
      return;
    }
    this.speak(this.selectedText, this.selectedRange);
  }

  stop(): void {
    this.utterance = null;
    if (this.supported) window.speechSynthesis.cancel();
    this.clearSelectionHighlight();
    this.message = '';
  }

  reset(): void {
    this.readFocus = false;
    document.documentElement.classList.remove('a11y-reading-focus');
    this.selectedText = '';
    this.selectedRange = null;
    this.clearFocusedLabels();
    this.stop();
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private clearFocusedLabels(): void {
    this.focusedLabels.forEach(label => label.classList.remove('a11y-reading-label'));
    this.focusedLabels = [];
  }

  private clearSelectionHighlight(): void {
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete('a11y-reading-selection');
  }

  private speak(text: string, range?: Range): void {
    if (!this.supported) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.lang = 'es-PE';
    if (range && typeof Highlight !== 'undefined' && 'highlights' in CSS) {
      CSS.highlights.set('a11y-reading-selection', new Highlight(range));
    } else if (range) {
      this.message = 'La lectura está disponible, pero este navegador no permite resaltar el texto durante la reproducción.';
    }
    utterance.onend = () => {
      if (this.utterance !== utterance) return;
      this.utterance = null;
      this.clearSelectionHighlight();
    };
    utterance.onerror = (event) => {
      if (this.utterance !== utterance) return;
      this.utterance = null;
      this.clearSelectionHighlight();
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      console.error('No se pudo reproducir la lectura.', event.error);
      this.message = 'No se pudo reproducir la lectura. Revisa la voz y el audio del dispositivo.';
      this.cdr.markForCheck();
    };
    window.speechSynthesis.speak(utterance);
  }
}
