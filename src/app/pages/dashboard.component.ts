import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_URL, AuthService } from '../auth.service';

interface Booking { _id: string; customer?: { name: string; email: string; phone: string }; room: { _id: string; name: string; type: string }; checkIn: string; checkOut: string; guests: number; paymentMethod: string; paymentCurrency: string; totalPen: number; totalUsd: number; status: 'pending' | 'confirmed' | 'cancelled'; }
interface RoomOption { _id: string; name: string; }
@Component({
  standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `<main><header style="background:#183b32;color:white;padding:18px 0"><div class="shell" style="display:flex;justify-content:space-between;align-items:center"><strong>Panel de reservas</strong><nav aria-label="Administración" style="display:flex;gap:12px"><a *ngIf="auth.hasRole(['ADMIN'])" routerLink="/users" style="color:white">Usuarios</a><button class="button" type="button" (click)="logout()">Cerrar sesión</button></nav></div></header>
    <section class="shell" style="padding-block:32px"><h1>Reservas</h1><div class="card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
      <label>Estado<select class="control" [(ngModel)]="filters.status" (change)="load()"><option value="">Todos</option><option value="pending">Pendiente</option><option value="confirmed">Confirmado vía Yape/Plin</option><option value="cancelled">Cancelado</option></select></label>
      <label>Desde<input class="control" type="date" [(ngModel)]="filters.from" (change)="load()"></label><label>Hasta<input class="control" type="date" [(ngModel)]="filters.to" (change)="load()"></label>
      <label>Habitación<select class="control" [(ngModel)]="filters.room" (change)="load()"><option value="">Todas</option><option *ngFor="let room of rooms" [value]="room._id">{{ room.name }}</option></select></label>
    </div><p *ngIf="error" class="error" role="alert" aria-live="assertive">{{ error }}</p><p *ngIf="loading" role="status" aria-live="polite">Cargando reservas…</p>
    <div class="card" style="overflow:auto;margin-top:20px"><table style="width:100%;border-collapse:collapse"><caption class="sr-only">Reservas registradas</caption><thead><tr><th>Cliente</th><th>Habitación</th><th>Fechas</th><th>Pago y total</th><th>Estado</th></tr></thead><tbody><tr *ngFor="let booking of bookings"><td>{{ booking.customer?.name ?? 'Datos protegidos' }}<br><small>{{ booking.customer?.phone ?? '' }}</small></td><td>{{ booking.room.name }}</td><td>{{ booking.checkIn | date:'dd/MM/yyyy':'UTC' }} - {{ booking.checkOut | date:'dd/MM/yyyy':'UTC' }}</td><td>{{ booking.paymentMethod }} · {{ booking.paymentCurrency }}<br><strong>{{ booking.paymentCurrency === 'USD' ? ('$' + booking.totalUsd) : ('S/ ' + booking.totalPen) }}</strong></td><td><select *ngIf="auth.hasRole(['ADMIN','RECEPTION'])" class="control" [ngModel]="booking.status" (ngModelChange)="updateStatus(booking, $event)" [attr.aria-label]="'Cambiar estado de reserva ' + booking._id"><option value="pending">Pendiente</option><option value="confirmed">Confirmado vía Yape/Plin</option><option value="cancelled">Cancelado</option></select><span *ngIf="!auth.hasRole(['ADMIN','RECEPTION'])">{{ statusLabel(booking.status) }}</span></td></tr></tbody></table><p *ngIf="!loading && !bookings.length">No hay reservas con estos filtros.</p></div></section></main>`,
  styles: [`th,td{text-align:left;border-bottom:1px solid #e1e7e2;padding:12px 8px;vertical-align:top}th{color:#183b32}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}`]
})
export class DashboardComponent {
  private readonly http = inject(HttpClient); readonly auth = inject(AuthService); private readonly router = inject(Router);
  bookings: Booking[] = []; rooms: RoomOption[] = []; loading = false; error = ''; filters = { status: '', from: '', to: '', room: '' };
  ngOnInit(): void {
    this.load();
    this.http.get<{ data: RoomOption[] }>(`${API_URL}/rooms`).subscribe({
      next: ({ data }) => this.rooms = data,
      error: (e) => { this.error = e.error?.message ?? 'No se pudieron cargar los filtros de habitaciones.'; }
    });
  }
  load(): void { let params = new HttpParams(); Object.entries(this.filters).forEach(([key, value]) => { if (value) params = params.set(key, value); }); this.loading = true; this.http.get<{ data: Booking[] }>(`${API_URL}/admin/bookings`, { params }).subscribe({ next: ({ data }) => { this.bookings = data; this.loading = false; }, error: (e) => { this.error = e.error?.message ?? 'No se pudieron cargar las reservas.'; this.loading = false; } }); }
  updateStatus(booking: Booking, status: Booking['status']): void { this.http.put<{ data: Booking }>(`${API_URL}/admin/bookings/${booking._id}/status`, { status }).subscribe({ next: ({ data }) => booking.status = data.status, error: (e) => { this.error = e.error?.message ?? 'No se pudo actualizar el estado.'; } }); }
  statusLabel(status: Booking['status']): string { return ({ pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado' })[status]; }
  logout(): void { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
