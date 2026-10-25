import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `<main class="shell" style="max-width:520px;padding-top:12vh"><section class="card" aria-labelledby="login-title">
    <img src="/assets/chaquillchaka-logo.png" alt="Chaquill Chak'a Hostal, desde 2008" width="180" height="67" style="display:block;margin:0 auto 12px;max-width:100%;height:auto"><h1 id="login-title">Acceso de recepción</h1>
    <p>Ingresa con la cuenta que te asignó el administrador.</p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label for="email">Correo administrativo</label><input id="email" class="control" type="email" formControlName="email" placeholder="admin@chaquillchaka.com.pe" autocomplete="username" aria-required="true" aria-describedby="email-help">
      <small id="email-help">Usa una cuenta @chaquillchaka.com.pe.</small>
      <small class="error" *ngIf="form.controls.email.invalid && form.controls.email.touched">Ingresa un correo válido de @chaquillchaka.com.pe.</small>
      <label for="password">Contraseña</label><input id="password" class="control" type="password" formControlName="password" autocomplete="current-password" aria-required="true">
      <small class="error" *ngIf="form.controls.password.invalid && form.controls.password.touched">La contraseña debe tener al menos 8 caracteres.</small>
      <p *ngIf="error" class="error" role="alert" aria-live="assertive">{{ error }}</p><button class="button" type="submit" [disabled]="loading">{{ loading ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  </section></main>`,
  styles: [`form{display:grid;gap:8px}label{margin-top:14px;font-weight:700}h1{color:#183b32}`]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder); private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^@\s]+@chaquillchaka\.com\.pe$/i)]], password: ['', [Validators.required, Validators.minLength(8)]] });
  loading = false; error = '';
  submit(): void { this.form.markAllAsTouched(); if (this.form.invalid) { (this.form.controls.email.invalid ? document.getElementById('email') : document.getElementById('password'))?.focus(); return; } this.loading = true; this.error = '';
    this.auth.login(this.form.value.email!, this.form.value.password!).subscribe({ next: ({ user }) => this.router.navigateByUrl(user.role === 'HR' ? '/users' : '/dashboard'), error: (e) => { this.error = e.error?.message ?? 'No fue posible iniciar sesión.'; this.loading = false; } });
  }
}
