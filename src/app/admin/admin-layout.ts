import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

@Component({ selector: 'app-admin-layout', imports: [RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './admin-layout.html' })
export class AdminLayout { constructor(readonly auth: AuthService, private readonly router: Router) {} salir(): void { this.auth.logout(); this.router.navigateByUrl('/login'); } }