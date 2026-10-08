import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../servicios/auth.service';
import { CartService } from '../servicios/cart.service';
import { usarImagenRespaldo } from '../util/imagen';

@Component({
  selector: 'app-empleado-layout',
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './empleado-layout.html'
})
export class EmpleadoLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly cartCount$ = inject(CartService).totalItems$;
  readonly manejarErrorImagen = usarImagenRespaldo;

  salir(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
