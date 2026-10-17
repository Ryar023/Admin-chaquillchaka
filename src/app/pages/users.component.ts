import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminHeaderComponent } from '../admin-header.component';
import { ConfirmDialogComponent } from '../confirm-dialog.component';
import { API_URL, AdminRole, AdminUser, AuthService } from '../auth.service';

interface ManagedUser extends AdminUser { isActive: boolean; createdAt: string; }
interface UserResponse { data: ManagedUser[]; }

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AdminHeaderComponent, ConfirmDialogComponent],
  template: `
    <main>
      <app-admin-header />
      <section class="shell page">
        <h1>Usuarios y roles</h1>
        <p>Asigna solo los permisos necesarios para las funciones de cada persona.</p>
        <p *ngIf="error" class="notice error" role="alert" aria-live="assertive">{{ error }}</p>
        <p *ngIf="success" class="notice success" role="status" aria-live="polite">{{ success }}</p>

        <section class="card create-card" aria-labelledby="create-title">
          <h2 id="create-title">Crear cuenta de usuario</h2>
          <form [formGroup]="form" (ngSubmit)="createUser()" novalidate>
            <label for="user-name">Nombre completo</label>
            <input id="user-name" class="control" formControlName="name" autocomplete="name" aria-required="true" [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched">
            <small class="error" *ngIf="form.controls.name.invalid && form.controls.name.touched">Escribe un nombre de al menos 2 caracteres.</small>

            <label for="user-email">Correo electrónico</label>
            <input id="user-email" class="control" type="email" formControlName="email" placeholder="recepcion@chaquillchaka.com.pe" autocomplete="email" aria-required="true" aria-describedby="email-help" [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched">
            <small id="email-help">Usa el dominio de prueba @chaquillchaka.com.pe; no se envían correos.</small>
            <small class="error" *ngIf="form.controls.email.invalid && form.controls.email.touched">Ingresa un correo válido que termine en @chaquillchaka.com.pe.</small>

            <label for="user-password">Contraseña temporal</label>
            <input id="user-password" class="control" type="password" formControlName="password" autocomplete="new-password" aria-required="true" aria-describedby="password-help" [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched">
            <small id="password-help">Mínimo 12 caracteres. Entrégala a la persona por un canal privado.</small>
            <small class="error" *ngIf="form.controls.password.invalid && form.controls.password.touched">La contraseña debe tener al menos 12 caracteres.</small>

            <label for="user-role">Rol</label>
            <select id="user-role" class="control" formControlName="role" aria-required="true">
              <option *ngFor="let role of availableRoles" [value]="role">{{ roleLabel(role) }}</option>
            </select>
            <p class="role-help">{{ roleDescription(form.controls.role.value) }}</p>
            <button class="button" type="submit" [disabled]="saving">{{ saving ? 'Creando cuenta…' : 'Crear usuario' }}</button>
          </form>
        </section>

        <section class="card users-card" aria-labelledby="users-title">
          <h2 id="users-title">Cuentas registradas</h2>
          <p *ngIf="loading" role="status" aria-live="polite">Cargando cuentas…</p>
          <div class="table-wrap" *ngIf="!loading">
            <table>
              <caption class="sr-only">Usuarios y roles del panel administrativo</caption>
              <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
              <tbody>
                <tr *ngFor="let user of users">
                  <td>{{ user.name }}</td><td>{{ user.email }}</td>
                  <td>
                    <select class="control" [ngModel]="roleDraft[user.id] ?? user.role" (ngModelChange)="roleDraft[user.id] = $event" [disabled]="user.id === currentUserId" [attr.aria-label]="'Rol de ' + user.name">
                      <option *ngFor="let role of availableRoles" [value]="role">{{ roleLabel(role) }}</option>
                    </select>
                    <div class="row-actions" *ngIf="hasRoleDraft(user)" aria-live="polite">
                      <button class="button" type="button" (click)="askRoleChange(user)">Confirmar cambio</button>
                      <button class="button secondary" type="button" (click)="discardRole(user)">Descartar</button>
                    </div>
                  </td>
                  <td>{{ user.isActive ? 'Activa' : 'Desactivada' }}</td>
                  <td><button class="button" type="button" (click)="askToggle(user)" [disabled]="user.id === currentUserId" [attr.aria-label]="(user.isActive ? 'Desactivar' : 'Activar') + ' cuenta de ' + user.name">{{ user.isActive ? 'Desactivar' : 'Activar' }}</button></td>
                </tr>
                <tr *ngIf="!users.length"><td colspan="5">No hay cuentas para mostrar.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
      <app-confirm-dialog *ngIf="pending" [title]="pending.title" [message]="pending.message" confirmLabel="Sí, confirmar" (confirmed)="runPending()" (cancelled)="pending = null" />
    </main>
  `,
  styles: [`
    .topbar { background:#183b32; color:white; padding:16px 0; }
    .topbar-content,nav { display:flex; align-items:center; justify-content:space-between; gap:16px; }
    nav a { min-height:44px; display:inline-flex; align-items:center; color:white; }
    .page { padding-block:28px 64px; }
    h1,h2 { color:#183b32; }
    .card { margin-top:20px; }
    .create-card form { max-width:620px; display:grid; gap:8px; }
    label { margin-top:8px; font-weight:700; }
    .role-help,small { color:#4c5b52; line-height:1.5; }
    .button { min-height:44px; }
    .secondary { border:2px solid #183b32; background:#fff; color:#183b32; }
    .row-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .notice { border-radius:6px; padding:12px; }
    .notice.error,.error { color:#98261d; background:#fff0ed; }
    .notice.success { color:#155b39; background:#eaf6ed; }
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; }
    th,td { min-height:44px; border-bottom:1px solid #e1e7e2; padding:10px; text-align:left; }
    th { color:#183b32; }
    .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
  `]
})
export class UsersComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly availableRoles: AdminRole[] = this.auth.hasRole(['ADMIN'])
    ? ['ADMIN', 'RECEPTION', 'ACCOUNTING', 'HR']
    : ['RECEPTION', 'ACCOUNTING', 'HR'];
  readonly currentUserId = this.auth.user()?.id;
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254), Validators.pattern(/^[^@\s]+@chaquillchaka\.com\.pe$/i)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    role: ['RECEPTION' as AdminRole, Validators.required]
  });
  users: ManagedUser[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.loading = true;
    this.http.get<UserResponse>(`${API_URL}/admin/users`).subscribe({
      next: ({ data }) => { this.users = data; this.loading = false; },
      error: (error) => { this.error = error.error?.message ?? 'No se pudieron cargar las cuentas.'; this.loading = false; }
    });
  }

  createUser(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.http.post<{ data: ManagedUser; message: string }>(`${API_URL}/admin/users`, this.form.getRawValue()).subscribe({
      next: ({ data, message }) => {
        this.users = [...this.users, data].sort((a, b) => a.name.localeCompare(b.name));
        this.form.reset({ name: '', email: '', password: '', role: 'RECEPTION' });
        this.success = `${message} Comparte la contraseña temporal de forma privada.`;
        this.saving = false;
      },
      error: (error) => {
        this.error = error.error?.message ?? 'No se pudo crear la cuenta.';
        this.saving = false;
      }
    });
  }

  roleDraft: Partial<Record<string, AdminRole>> = {};
  pending: { title: string; message: string; run: () => void } | null = null;

  hasRoleDraft(user: ManagedUser): boolean { return !!this.roleDraft[user.id] && this.roleDraft[user.id] !== user.role; }
  discardRole(user: ManagedUser): void { delete this.roleDraft[user.id]; }

  askRoleChange(user: ManagedUser): void {
    const role = this.roleDraft[user.id]!;
    this.pending = {
      title: '¿Deseas confirmar este cambio de rol?',
      message: `${user.name} pasará de ${this.roleLabel(user.role)} a ${this.roleLabel(role)}.`,
      run: () => { this.updateUser(user, { role }, 'Rol actualizado.'); delete this.roleDraft[user.id]; }
    };
  }

  askToggle(user: ManagedUser): void {
    const action = user.isActive ? 'desactivar' : 'activar';
    this.pending = {
      title: `¿Deseas ${action} esta cuenta?`,
      message: `Se va a ${action} la cuenta de ${user.name} (${user.email}).`,
      run: () => this.updateUser(user, { isActive: !user.isActive }, `Cuenta ${user.isActive ? 'desactivada' : 'activada'}.`)
    };
  }

  runPending(): void {
    const action = this.pending;
    this.pending = null;
    action?.run();
  }

  roleLabel(role: AdminRole): string {
    return ({ ADMIN: 'Administrador', RECEPTION: 'Recepción', ACCOUNTING: 'Contabilidad', HR: 'Recursos Humanos' })[role];
  }

  roleDescription(role: AdminRole): string {
    return ({
      ADMIN: 'Acceso completo, incluida la gestión de cuentas y reservas.',
      RECEPTION: 'Consulta los datos de reservas y actualiza su estado.',
      ACCOUNTING: 'Consulta fechas, habitaciones, medios de pago y montos; no ve datos personales ni modifica reservas.',
      HR: 'Gestiona cuentas de personal, excepto cuentas de Administrador; no accede a reservas.'
    })[role];
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private updateUser(user: ManagedUser, changes: { role?: AdminRole; isActive?: boolean }, message: string): void {
    this.error = '';
    this.success = '';
    this.http.put<{ data: ManagedUser }>(`${API_URL}/admin/users/${user.id}`, changes).subscribe({
      next: ({ data }) => {
        Object.assign(user, data);
        this.success = message;
      },
      error: (error) => { this.error = error.error?.message ?? 'No se pudo actualizar la cuenta.'; }
    });
  }
}
