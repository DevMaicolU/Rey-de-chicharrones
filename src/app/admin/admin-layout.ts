import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { ThemeService } from '../servicios/theme.service';

@Component({ selector: 'app-admin-layout', imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './admin-layout.html' })
export class AdminLayout {
  readonly auth = inject(AuthService);
  readonly database = inject(DatabaseService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  salir(): void { this.auth.logout(); this.router.navigateByUrl('/login'); }
}