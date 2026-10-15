import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from './cart.service';
import { AuthService } from './auth.service';

export type EstadoPedidoEnEspera = 'en-espera' | 'en-preparacion' | 'por-cobrar';

export interface PedidoEnEspera {
  id: string;
  mesa: number;
  cliente: string;
  hora: string;
  estado: EstadoPedidoEnEspera;
  items: CartItem[];
  total: number;
  empleadoId: number;
  empleadoNombre: string;
}

@Injectable({ providedIn: 'root' })
export class PedidosEnEsperaService {
  private readonly auth = inject(AuthService);
  private readonly pedidosSubject = new BehaviorSubject<PedidoEnEspera[]>([]);
  readonly pedidos$ = this.pedidosSubject.asObservable();

  get pedidos(): PedidoEnEspera[] { return this.pedidosSubject.value; }

  /** Pedidos del empleado con sesión activa, ordenados de más reciente a más antiguo. */
  get pedidosPropios(): PedidoEnEspera[] {
    const idEmpleado = this.auth.activeUser?.id;
    return this.pedidos.filter(p => p.empleadoId === idEmpleado);
  }

  registrar(mesa: number, cliente: string, items: CartItem[]): PedidoEnEspera {
    const empleado = this.auth.activeUser!;
    const pedido: PedidoEnEspera = {
      id: `pedido-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mesa,
      cliente: cliente.trim(),
      hora: new Date().toISOString(),
      estado: 'en-espera',
      items: items.map(item => ({ ...item })),
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
      empleadoId: empleado.id,
      empleadoNombre: empleado.name
    };
    this.pedidosSubject.next([pedido, ...this.pedidos]);
    return pedido;
  }

  actualizarItems(id: string, items: CartItem[]): void {
    this.pedidosSubject.next(this.pedidos.map(p =>
      p.id === id
        ? { ...p, items: items.map(i => ({ ...i })), total: items.reduce((s, i) => s + i.subtotal, 0) }
        : p
    ));
  }

  actualizarEstado(id: string, estado: EstadoPedidoEnEspera): void {
    this.pedidosSubject.next(this.pedidos.map(p => p.id === id ? { ...p, estado } : p));
  }

  eliminar(id: string): void {
    this.pedidosSubject.next(this.pedidos.filter(p => p.id !== id));
  }

  buscar(id: string): PedidoEnEspera | undefined {
    return this.pedidos.find(p => p.id === id);
  }
}
