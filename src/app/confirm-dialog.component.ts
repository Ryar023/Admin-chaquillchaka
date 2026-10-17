import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="backdrop" role="presentation" (click)="cancelled.emit()">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" (click)="$event.stopPropagation()">
        <h2 id="confirm-title">{{ title }}</h2>
        <p id="confirm-message">{{ message }}</p>
        <div class="actions">
          <button class="button secondary" type="button" (click)="cancelled.emit()">Cancelar</button>
          <button class="button" type="button" data-autofocus (click)="confirmed.emit()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>`,
  styles: [`
    .backdrop{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(15,30,25,.6);padding:16px}
    .dialog{width:min(460px,100%);background:#fff;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    h2{margin:0 0 8px;color:#183b32;font-size:22px}p{margin:0 0 20px;color:#2b3a34;line-height:1.5}
    .actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
    .secondary{background:#fff;color:#183b32;border:2px solid #183b32}
  `]
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  @Input() title = '¿Confirmar cambio?';
  @Input() message = '';
  @Input() confirmLabel = 'Sí, confirmar';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private previousFocus: HTMLElement | null = null;

  ngOnInit(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    queueMicrotask(() => this.host.nativeElement.querySelector('[data-autofocus]')?.focus());
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.cancelled.emit(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(this.host.nativeElement.querySelectorAll('button')) as HTMLElement[];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}
