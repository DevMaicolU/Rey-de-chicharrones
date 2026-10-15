import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from './cart.service';
import { AuthService } from './auth.service';

export type EstadoPedidoEnEspera = 'en-espera' | 'en-preparacion' | 'por-cobrar';

export interface PedidoEnEspera {
  id: string;
  mesa: number;
  cliente: string;
  cedulaCliente: string;
  hora: string;
  estado: EstadoPedidoEnEspera;
  items: CartItem[];
  total: number;
  empleadoId: number;
  empleadoNombre: string;
}

const STORAGE_KEY_ESPERA = 'royalsoft-pedidos-espera-v1';

@Injectable({ providedIn: 'root' })
export class PedidosEnEsperaService {
  private readonly auth = inject(AuthService);
  private readonly pedidosSubject = new BehaviorSubject<PedidoEnEspera[]>(this.cargarStorage());
  readonly pedidos$ = this.pedidosSubject.asObservable();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY_ESPERA) {
          this.pedidosSubject.next(this.cargarStorage());
        }
      });
    }
  }

  private cargarStorage(): PedidoEnEspera[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ESPERA);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private guardarStorage(pedidos: PedidoEnEspera[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_ESPERA, JSON.stringify(pedidos));
    } catch {
      // ignore
    }
  }

  get pedidos(): PedidoEnEspera[] { return this.pedidosSubject.value; }

  /** Pedidos del empleado con sesión activa, ordenados de más reciente a más antiguo. */
  get pedidosPropios(): PedidoEnEspera[] {
    const idEmpleado = this.auth.activeUser?.id;
    return this.pedidos.filter(p => p.empleadoId === idEmpleado);
  }

  registrar(mesa: number, cliente: string, cedulaCliente: string, items: CartItem[]): PedidoEnEspera {
    const empleado = this.auth.activeUser!;
    const pedido: PedidoEnEspera = {
      id: `pedido-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mesa,
      cliente: cliente.trim(),
      cedulaCliente: cedulaCliente.trim(),
      hora: new Date().toISOString(),
      estado: 'en-espera',
      items: items.map(item => ({ ...item })),
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
      empleadoId: empleado.id,
      empleadoNombre: empleado.name
    };
    const nuevos = [pedido, ...this.pedidos];
    this.pedidosSubject.next(nuevos);
    this.guardarStorage(nuevos);
    return pedido;
  }

  actualizarItems(id: string, items: CartItem[]): void {
    const actualizados = this.pedidos.map(p =>
      p.id === id
        ? { ...p, items: items.map(i => ({ ...i })), total: items.reduce((s, i) => s + i.subtotal, 0) }
        : p
    );
    this.pedidosSubject.next(actualizados);
    this.guardarStorage(actualizados);
  }

  actualizarEstado(id: string, estado: EstadoPedidoEnEspera): void {
    const actualizados = this.pedidos.map(p => p.id === id ? { ...p, estado } : p);
    this.pedidosSubject.next(actualizados);
    this.guardarStorage(actualizados);
  }

  eliminar(id: string): void {
    const actualizados = this.pedidos.filter(p => p.id !== id);
    this.pedidosSubject.next(actualizados);
    this.guardarStorage(actualizados);
  }

  buscar(id: string): PedidoEnEspera | undefined {
    return this.pedidos.find(p => p.id === id);
  }
}
