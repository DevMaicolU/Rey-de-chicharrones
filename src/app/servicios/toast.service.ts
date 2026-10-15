import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastTipo = 'exito' | 'error' | 'info' | 'advertencia';

export interface Toast {
  id: string;
  mensaje: string;
  tipo: ToastTipo;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  private mostrar(mensaje: string, tipo: ToastTipo, duracionMs = 3500): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { id, mensaje, tipo };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.cerrar(id), duracionMs);
  }

  exito(mensaje: string): void { this.mostrar(mensaje, 'exito'); }
  error(mensaje: string): void { this.mostrar(mensaje, 'error', 5000); }
  info(mensaje: string): void { this.mostrar(mensaje, 'info'); }
  advertencia(mensaje: string): void { this.mostrar(mensaje, 'advertencia', 4500); }

  cerrar(id: string): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
