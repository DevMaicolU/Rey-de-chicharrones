import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../servicios/database.service';

@Component({ selector: 'app-proveedores', imports: [FormsModule], templateUrl: './proveedores.html' })
export class Proveedores {
  private readonly database = inject(DatabaseService);
  readonly providers = toSignal(this.database.providers$, { initialValue: [] as string[] });

  provider = '';
  error = '';

  add(): void {
    const resultado = this.database.addProvider(this.provider);
    this.error = resultado.error ?? '';
    if (resultado.ok) this.provider = '';
  }

  remove(provider: string): void {
    this.database.deleteProvider(provider);
  }
}
