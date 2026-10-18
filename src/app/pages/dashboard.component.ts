import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_URL, AuthService } from '../auth.service';
import { AdminHeaderComponent } from '../admin-header.component';
import { ConfirmDialogComponent } from '../confirm-dialog.component';
import { ExportRow, exportToExcel, exportToPdf } from '../export.util';

type Status = 'pending' | 'confirmed' | 'cancelled';
interface Billing { documentType: 'boleta' | 'factura'; ruc?: string; businessName?: string; fiscalAddress?: string; }
interface Booking {
  _id: string;
  customer?: { name: string; email: string; phone: string };
  room: { _id: string; name: string; type: string };
  checkIn: string; checkOut: string; guests: number; nights?: number;
  paymentMethod: string; paymentCurrency: string; totalPen: number; totalUsd: number;
  billing?: Billing; status: Status;
}
interface RoomOption { _id: string; name: string; }

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', RECEPTION: 'Recepción', ACCOUNTING: 'Contabilidad', HR: 'Recursos Humanos' };
const PAYMENT_LABELS: Record<string, string> = { yape: 'Yape', plin: 'Plin', card: 'Tarjeta', cash: 'Efectivo' };
const STATUS_LABELS: Record<Status, string> = { pending: 'Pendiente', confirmed: 'Confirmado vía Yape/Plin', cancelled: 'Cancelado' };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, AdminHeaderComponent, ConfirmDialogComponent],
  template: `
  <app-admin-header />

  <main class="shell page">
    <div class="page-head">
      <div><h1>Reservas</h1><p class="lead">Gestiona el estado de pago y el comprobante de cada reserva.</p></div>
      <div class="head-actions">
        <button class="button ghost-dark" type="button" (click)="exportExcel()" [disabled]="!visibleBookings.length">Exportar Excel</button>
        <button class="button ghost-dark" type="button" (click)="exportPdf()" [disabled]="!visibleBookings.length">Exportar PDF</button>
        <button class="button" type="button" (click)="load()" [disabled]="loading">{{ loading ? 'Actualizando…' : 'Actualizar' }}</button>
      </div>
    </div>

    <section class="stats" aria-label="Resumen de reservas" aria-live="polite">
      <article class="stat"><span>Total</span><strong>{{ bookings.length }}</strong></article>
      <article class="stat warn"><span>Pendientes</span><strong>{{ count('pending') }}</strong></article>
      <article class="stat ok"><span>Confirmadas</span><strong>{{ count('confirmed') }}</strong></article>
      <article class="stat bad"><span>Canceladas</span><strong>{{ count('cancelled') }}</strong></article>
      <article class="stat"><span>Facturas solicitadas</span><strong>{{ invoiceCount }}</strong></article>
      <article class="stat money"><span>Confirmado</span><strong>S/ {{ confirmedPen | number:'1.2-2' }}</strong><small>$ {{ confirmedUsd | number:'1.2-2' }}</small></article>
    </section>

    <section class="card filters" aria-label="Filtros">
      <label>Estado<select class="control" [(ngModel)]="filters.status" (change)="load()"><option value="">Todos</option><option value="pending">Pendiente</option><option value="confirmed">Confirmado vía Yape/Plin</option><option value="cancelled">Cancelado</option></select></label>
      <label>Desde<input class="control" type="date" [(ngModel)]="filters.from" (change)="load()"></label>
      <label>Hasta<input class="control" type="date" [(ngModel)]="filters.to" (change)="load()"></label>
      <label>Habitación<select class="control" [(ngModel)]="filters.room" (change)="load()"><option value="">Todas</option><option *ngFor="let room of rooms" [value]="room._id">{{ room.name }}</option></select></label>
      <label>Comprobante<select class="control" [(ngModel)]="documentFilter"><option value="">Todos</option><option value="boleta">Boleta</option><option value="factura">Factura</option></select></label>
      <button class="button ghost-dark" type="button" (click)="clearFilters()">Limpiar filtros</button>
    </section>

    <p *ngIf="error" class="alert" role="alert" aria-live="assertive">{{ error }}</p>
    <p *ngIf="loading" role="status" aria-live="polite" class="muted">Cargando reservas… la primera carga puede tardar hasta un minuto.</p>

    <section class="card table-card">
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Reservas registradas</caption>
          <thead><tr><th scope="col">Cliente</th><th scope="col">Habitación</th><th scope="col">Fechas</th><th scope="col">Comprobante</th><th scope="col">Pago y total</th><th scope="col">Estado</th></tr></thead>
          <tbody>
            <tr *ngFor="let booking of visibleBookings">
              <td><strong>{{ booking.customer?.name ?? 'Datos protegidos' }}</strong><small *ngIf="booking.customer">{{ booking.customer.phone }}</small><small *ngIf="booking.customer">{{ booking.customer.email }}</small></td>
              <td>{{ booking.room.name }}<small>{{ booking.guests }} {{ booking.guests === 1 ? 'huésped' : 'huéspedes' }}</small></td>
              <td>{{ booking.checkIn | date:'dd/MM/yyyy':'UTC' }} → {{ booking.checkOut | date:'dd/MM/yyyy':'UTC' }}<small *ngIf="booking.nights">{{ booking.nights }} {{ booking.nights === 1 ? 'noche' : 'noches' }}</small></td>
              <td>
                <span class="badge" [class.badge-invoice]="isInvoice(booking)">{{ isInvoice(booking) ? 'Factura' : 'Boleta' }}</span>
                <ng-container *ngIf="isInvoice(booking)"><small>RUC {{ booking.billing?.ruc }}</small><small>{{ booking.billing?.businessName }}</small><small>{{ booking.billing?.fiscalAddress }}</small></ng-container>
              </td>
              <td>{{ paymentLabel(booking.paymentMethod) }} · {{ booking.paymentCurrency }}<strong class="amount">{{ booking.paymentCurrency === 'USD' ? ('$ ' + (booking.totalUsd | number:'1.2-2')) : ('S/ ' + (booking.totalPen | number:'1.2-2')) }}</strong></td>
              <td>
                <span class="badge" [ngClass]="'st-' + booking.status">{{ statusLabel(booking.status) }}</span>
                <ng-container *ngIf="auth.hasRole(['ADMIN','RECEPTION'])">
                  <select class="control status-select" [ngModel]="draft[booking._id] ?? booking.status" (ngModelChange)="draft[booking._id] = $event" [attr.aria-label]="'Cambiar estado de la reserva de ' + (booking.customer?.name ?? booking._id)"><option value="pending">Pendiente</option><option value="confirmed">Confirmado vía Yape/Plin</option><option value="cancelled">Cancelado</option></select>
                  <div class="row-actions" *ngIf="hasDraft(booking)" aria-live="polite">
                    <button class="button" type="button" (click)="askConfirm(booking)">Confirmar cambio</button>
                    <button class="button ghost-dark" type="button" (click)="discard(booking)">Descartar</button>
                  </div>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!loading && !visibleBookings.length" class="empty">No hay reservas con estos filtros.</p>
    </section>
  </main>
  <app-confirm-dialog *ngIf="pending" title="¿Deseas confirmar este cambio?"
    [message]="'La reserva de ' + (pending.booking.customer?.name ?? 'este cliente') + ' pasará de «' + statusLabel(pending.booking.status) + '» a «' + statusLabel(pending.status) + '».'"
    confirmLabel="Sí, confirmar" (confirmed)="applyPending()" (cancelled)="pending = null" />
  <p *ngIf="success" class="toast" role="status" aria-live="polite">{{ success }}</p>`,
  styles: [`
    .topbar{background:#183b32;color:#fff}.topbar-inner{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:12px}.brand strong{display:block}.brand small{display:block;color:#cfe3d9}
    .brand-mark{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#e9c46a;color:#183b32;font-weight:800;font-size:20px}
    .topnav{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.who{display:flex;flex-direction:column;text-align:right;font-size:14px}.who small{color:#cfe3d9}
    .nav-link{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:#fff;font-weight:600}
    .button.ghost{background:transparent;border:2px solid #fff}.button.ghost-dark{background:#fff;color:#183b32;border:2px solid #183b32}
    .page{padding-block:28px 48px}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px}
    h1{margin:0;font-size:32px;color:#183b32}.lead{margin:4px 0 0;color:#46544d}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
    .stat{background:#fff;border:1px solid #dce3dd;border-left:5px solid #183b32;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
    .stat span{font-size:13px;color:#46544d}.stat strong{font-size:26px;color:#183b32}.stat small{color:#46544d}
    .stat.warn{border-left-color:#b45309}.stat.ok{border-left-color:#166534}.stat.bad{border-left-color:#991b1b}.stat.money{border-left-color:#1d4ed8}
    .filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;align-items:end;margin-bottom:16px}
    .filters label{display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:14px}
    .alert{background:#fde8e6;border:1px solid #9d281c;color:#7a1d14;padding:12px 14px;border-radius:8px}.muted{color:#46544d}
    .table-card{padding:0;overflow:hidden}.table-wrap{overflow-x:auto}table{width:100%;min-width:900px;border-collapse:collapse}
    th,td{text-align:left;border-bottom:1px solid #e1e7e2;padding:14px 12px;vertical-align:top}
    th{background:#eef3ee;color:#183b32;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
    tbody tr:hover{background:#f7faf7}td small{display:block;color:#46544d;font-size:13px;margin-top:2px}.amount{display:block;margin-top:4px;color:#183b32;font-size:17px}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:700;background:#e5e7eb;color:#1f2937;margin-bottom:6px}
    .badge-invoice{background:#dbeafe;color:#1e3a8a}.st-pending{background:#fef3c7;color:#78350f}.st-confirmed{background:#dcfce7;color:#14532d}.st-cancelled{background:#fee2e2;color:#7f1d1d}
    .head-actions{display:flex;gap:10px;flex-wrap:wrap}
    .status-select{margin-top:4px;min-width:200px}.row-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .toast{position:fixed;right:16px;bottom:16px;margin:0;background:#14532d;color:#fff;padding:12px 18px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)}.empty{padding:28px;text-align:center;color:#46544d;margin:0}
    .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  `]
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  bookings: Booking[] = [];
  rooms: RoomOption[] = [];
  loading = false;
  error = '';
  documentFilter = '';
  draft: Partial<Record<string, Status>> = {};
  pending: { booking: Booking; status: Status } | null = null;
  success = '';
  filters = { status: '', from: '', to: '', room: '' };

  ngOnInit(): void {
    this.load();
    this.http.get<{ data: RoomOption[] }>(`${API_URL}/rooms`).subscribe({
      next: ({ data }) => this.rooms = data,
      error: (e) => { this.error = e.error?.message ?? 'No se pudieron cargar los filtros de habitaciones.'; }
    });
  }

  get visibleBookings(): Booking[] {
    return this.documentFilter ? this.bookings.filter((b) => (b.billing?.documentType ?? 'boleta') === this.documentFilter) : this.bookings;
  }
  get invoiceCount(): number { return this.bookings.filter((b) => this.isInvoice(b)).length; }
  get confirmedPen(): number { return this.bookings.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPen, 0); }
  get confirmedUsd(): number { return this.bookings.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + b.totalUsd, 0); }
  count(status: Status): number { return this.bookings.filter((b) => b.status === status).length; }
  isInvoice(booking: Booking): boolean { return booking.billing?.documentType === 'factura'; }
  paymentLabel(method: string): string { return PAYMENT_LABELS[method] ?? method; }
  roleLabel(role: string): string { return ROLE_LABELS[role] ?? role; }
  statusLabel(status: Status): string { return STATUS_LABELS[status]; }

  clearFilters(): void {
    this.filters = { status: '', from: '', to: '', room: '' };
    this.documentFilter = '';
    this.load();
  }

  load(): void {
    let params = new HttpParams();
    Object.entries(this.filters).forEach(([key, value]) => { if (value) params = params.set(key, value); });
    this.loading = true;
    this.error = '';
    this.http.get<{ data: Booking[] }>(`${API_URL}/admin/bookings`, { params }).subscribe({
      next: ({ data }) => { this.bookings = data; this.loading = false; },
      error: (e) => { this.error = e.error?.message ?? 'No se pudieron cargar las reservas.'; this.loading = false; }
    });
  }

  updateStatus(booking: Booking, status: Status): void {
    this.http.put<{ data: Booking }>(`${API_URL}/admin/bookings/${booking._id}/status`, { status }).subscribe({
      next: ({ data }) => {
        booking.status = data.status;
        delete this.draft[booking._id];
        this.success = 'Cambio guardado correctamente.';
        setTimeout(() => this.success = '', 4000);
      },
      error: (e) => { this.error = e.error?.message ?? 'No se pudo actualizar el estado.'; }
    });
  }

  hasDraft(booking: Booking): boolean { return !!this.draft[booking._id] && this.draft[booking._id] !== booking.status; }
  discard(booking: Booking): void { delete this.draft[booking._id]; }
  askConfirm(booking: Booking): void { this.pending = { booking, status: this.draft[booking._id]! }; }
  applyPending(): void {
    if (!this.pending) return;
    const { booking, status } = this.pending;
    this.pending = null;
    this.updateStatus(booking, status);
  }

  private exportRows(): ExportRow[] {
    const date = (value: string): string => new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    return this.visibleBookings.map((b) => ({
      cliente: b.customer?.name ?? 'Datos protegidos',
      telefono: b.customer?.phone ?? '',
      correo: b.customer?.email ?? '',
      habitacion: b.room.name,
      llegada: date(b.checkIn),
      salida: date(b.checkOut),
      noches: String(b.nights ?? ''),
      comprobante: this.isInvoice(b) ? 'Factura' : 'Boleta',
      ruc: b.billing?.ruc ?? '',
      razonSocial: b.billing?.businessName ?? '',
      medioPago: this.paymentLabel(b.paymentMethod),
      moneda: b.paymentCurrency,
      total: (b.paymentCurrency === 'USD' ? b.totalUsd : b.totalPen).toFixed(2),
      estado: this.statusLabel(b.status)
    }));
  }

  private exportName(): string {
    const range = [this.filters.from, this.filters.to].filter(Boolean).join('_a_');
    return `reservas-chaquillchaka${range ? '-' + range : ''}`;
  }

  async exportExcel(): Promise<void> {
    try {
      await exportToExcel(this.exportRows(), this.exportName());
      this.notify('Archivo Excel generado.');
    } catch {
      this.error = 'No se pudo generar el archivo Excel.';
    }
  }

  exportPdf(): void {
    const range = this.filters.from || this.filters.to ? `Fechas: ${this.filters.from || '…'} a ${this.filters.to || '…'}` : 'Todas las fechas';
    const ok = exportToPdf(this.exportRows(), "Reservas · Chaquill Chak'a Hostal", `${range} · ${this.visibleBookings.length} reservas`);
    if (!ok) this.error = 'Tu navegador bloqueó la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo.';
  }

  private notify(message: string): void {
    this.success = message;
    setTimeout(() => this.success = '', 4000);
  }

  logout(): void { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
