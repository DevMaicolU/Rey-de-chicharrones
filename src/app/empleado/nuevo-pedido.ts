import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { CartItem, CartService } from '../servicios/cart.service';
import { DatabaseService, PaymentMethod } from '../servicios/database.service';
import { PedidosEnEsperaService, PedidoEnEspera } from '../servicios/pedidos-en-espera.service';
import { ToastService } from '../servicios/toast.service';
import { OrderItem, Product } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({
  selector: 'app-nuevo-pedido',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './nuevo-pedido.html'
})
export class NuevoPedido {
  private readonly database = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly pedidosEspera = inject(PedidosEnEsperaService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly items = toSignal(this.cart.carritoActual$, { initialValue: this.cart.items });
  readonly pedidosEnEspera = toSignal(this.pedidosEspera.pedidos$, { initialValue: [] as PedidoEnEspera[] });
  readonly imagenRespaldo = IMAGEN_RESPALDO;
  readonly manejarErrorImagen = usarImagenRespaldo;

  // --- Fase A: Toma de comanda ---
  tableNumber: number | null = null;
  customerName = '';
  customerCedula = '';
  error = '';

  // --- Fase B: Edición de pedido en espera ---
  pedidoEditando: PedidoEnEspera | null = null;
  itemsEditando: CartItem[] = [];
  readonly menu = toSignal(this.database.activeProducts$, { initialValue: this.database.activeProducts });

  // --- Fase C: Modal de cobro ---
  modalCobroVisible = signal(false);
  pedidoACobrar: PedidoEnEspera | null = null;
  paymentMethod: PaymentMethod = 'efectivo';
  applyDiscount = false;
  errorCobro = '';

  // --- Confirmación de cancelación ---
  pedidoACancelar: PedidoEnEspera | null = null;
  modalCancelVisible = signal(false);

  // ======================= Calculos del carrito actual =======================
  subtotal(): number { return this.cart.total(); }
  discount(): number {
    return 0; // El descuento solo se aplica en cobro
  }
  totalCarrito(): number { return this.cart.total(); }

  // ======================= Calculos para cobro =======================
  subtotalCobro(): number {
    if (!this.pedidoACobrar) return 0;
    return this.pedidoACobrar.total;
  }
  descuentoCobro(): number {
    if (!this.pedidoACobrar) return 0;
    return this.applyDiscount ? Math.round(this.pedidoACobrar.total * 0.10) : 0;
  }
  totalCobro(): number {
    return this.subtotalCobro() - this.descuentoCobro();
  }

  // ======================= Fase A: Toma de comanda =======================
  cambiarCantidad(item: CartItem, cantidad: number): void {
    if (!this.database.stockSuficiente(item.producto, Math.max(1, Math.floor(cantidad)), 0)) {
      this.toast.advertencia('Stock insuficiente para este producto.');
      return;
    }
    this.cart.cambiarCantidad(item.producto.id, cantidad);
  }

  editarCantidad(item: CartItem, campo: HTMLInputElement): void {
    const valor = campo.valueAsNumber;
    if (!Number.isNaN(valor)) this.cart.cambiarCantidad(item.producto.id, valor);
    const actual = this.cart.items.find(i => i.producto.id === item.producto.id);
    campo.value = String(actual?.cantidad ?? item.cantidad);
  }

  eliminar(item: CartItem): void {
    this.cart.eliminarDelCarrito(item.producto.id);
  }

  registrarPedido(): void {
    this.error = '';
    const cartItems = this.cart.items;
    if (!cartItems.length) {
      this.error = 'Agrega al menos un producto al pedido antes de registrarlo.';
      return;
    }

    const mesa = this.tableNumber;
    if (mesa === null || !Number.isInteger(mesa) || mesa < 1) {
      this.error = 'Indica un número de mesa válido (entero mayor a 0).';
      return;
    }
    if (!this.customerName.trim()) {
      this.error = 'Escribe el nombre del cliente.';
      return;
    }
    if (!/^\d{6,12}$/.test(this.customerCedula.trim())) {
      this.error = 'La cédula debe contener entre 6 y 12 dígitos.';
      return;
    }

    const pedido = this.pedidosEspera.registrar(mesa, this.customerName, this.customerCedula, cartItems);
    this.cart.limpiarCarrito();
    this.tableNumber = null;
    this.customerName = '';
    this.customerCedula = '';
    this.error = '';
    this.toast.exito(`Pedido de mesa ${pedido.mesa} registrado y enviado a espera.`);
  }

  /** Alias de compatibilidad para integraciones y pruebas que usaban el nombre anterior. */
  finalizarPedido(): void {
    // Compatibilidad con integraciones antiguas; la UI nueva exige la cédula explícita.
    if (!this.customerCedula.trim()) this.customerCedula = '000000';
    this.registrarPedido();
    if (!this.error) void this.router.navigateByUrl('/empleado/registros');
  }

  // ======================= Fase B: Edición de pedido en espera =======================
  pedidosPropios(): PedidoEnEspera[] {
    const idEmpleado = this.auth.activeUser?.id;
    return this.pedidosEnEspera().filter(p => p.empleadoId === idEmpleado);
  }

  abrirEdicion(pedido: PedidoEnEspera): void {
    this.pedidoEditando = pedido;
    this.itemsEditando = pedido.items.map(i => ({ ...i }));
  }

  cerrarEdicion(): void {
    this.pedidoEditando = null;
    this.itemsEditando = [];
  }

  cambiarCantidadEdicion(item: CartItem, cantidad: number): void {
    const cant = Math.max(1, Math.floor(cantidad));
    if (!this.database.stockSuficiente(item.producto, cant)) {
      this.toast.advertencia('Stock insuficiente para este producto.');
      return;
    }
    this.itemsEditando = this.itemsEditando.map(i =>
      i.producto.id === item.producto.id
        ? { ...i, cantidad: cant, subtotal: i.producto.price * cant }
        : i
    );
  }

  eliminarItemEdicion(item: CartItem): void {
    this.itemsEditando = this.itemsEditando.filter(i => i.producto.id !== item.producto.id);
  }

  agregarProductoEdicion(producto: Product): void {
    const actual = this.itemsEditando.find(item => item.producto.id === producto.id);
    const cantidadActual = actual?.cantidad ?? 0;
    if (!this.database.stockSuficiente(producto, 1, cantidadActual)) {
      this.toast.advertencia('Stock insuficiente para este producto.');
      return;
    }
    if (actual) this.cambiarCantidadEdicion(actual, actual.cantidad + 1);
    else this.itemsEditando = [...this.itemsEditando, { producto, cantidad: 1, subtotal: producto.price }];
    this.toast.exito(`${producto.name} añadido al pedido.`);
  }

  totalEdicion(): number {
    return this.itemsEditando.reduce((s, i) => s + i.subtotal, 0);
  }

  guardarEdicion(): void {
    if (!this.pedidoEditando) return;
    if (!this.itemsEditando.length) {
      this.toast.error('El pedido debe tener al menos un producto. Si deseas eliminarlo, usa "Cancelar pedido".');
      return;
    }
    this.pedidosEspera.actualizarItems(this.pedidoEditando.id, this.itemsEditando);
    this.toast.exito('Pedido actualizado correctamente.');
    this.cerrarEdicion();
  }

  // ======================= Cancelar pedido =======================
  abrirCancelacion(pedido: PedidoEnEspera): void {
    this.pedidoACancelar = pedido;
    this.modalCancelVisible.set(true);
  }

  cerrarCancelacion(): void {
    this.pedidoACancelar = null;
    this.modalCancelVisible.set(false);
  }

  confirmarCancelacion(): void {
    if (!this.pedidoACancelar) return;
    const mesa = this.pedidoACancelar.mesa;
    this.pedidosEspera.eliminar(this.pedidoACancelar.id);
    this.cerrarCancelacion();
    this.toast.info(`Pedido de mesa ${mesa} cancelado.`);
  }

  // ======================= Fase C: Cobro =======================
  abrirCobro(pedido: PedidoEnEspera): void {
    this.pedidoACobrar = pedido;
    this.paymentMethod = 'efectivo';
    this.applyDiscount = false;
    this.errorCobro = '';
    this.modalCobroVisible.set(true);
  }

  cerrarCobro(): void {
    this.pedidoACobrar = null;
    this.modalCobroVisible.set(false);
    this.errorCobro = '';
  }

  finalizarCobro(): void {
    this.errorCobro = '';
    const pedido = this.pedidoACobrar;
    const employee = this.auth.activeUser;

    if (!pedido || !employee) {
      this.errorCobro = 'Error inesperado. Recarga la página e intenta de nuevo.';
      return;
    }

    const orderItems: OrderItem[] = pedido.items.map(item => ({
      productId: item.producto.id,
      productName: item.producto.name,
      quantity: item.cantidad,
      unitPrice: item.producto.price
    }));

    const resultado = this.database.registrarVenta({
      tableNumber: pedido.mesa,
      customerName: pedido.cliente,
      customerCedula: pedido.cedulaCliente,
      employeeId: employee.id,
      employeeName: employee.name,
      items: orderItems,
      paymentMethod: this.paymentMethod,
      applyDiscount: this.applyDiscount
    });

    if (!resultado.ok) {
      this.errorCobro = resultado.error ?? 'No fue posible registrar la venta.';
      return;
    }

    this.pedidosEspera.eliminar(pedido.id);
    this.cerrarCobro();
    this.toast.exito(`¡Pedido de mesa ${pedido.mesa} cobrado exitosamente!`);
  }

  // ======================= Helpers =======================
  etiquetaEstado(estado: PedidoEnEspera['estado']): string {
    const etiquetas: Record<PedidoEnEspera['estado'], string> = {
      'en-espera': 'En espera',
      'en-preparacion': 'En preparación',
      'por-cobrar': 'Por cobrar'
    };
    return etiquetas[estado];
  }

  claseBadgeEstado(estado: PedidoEnEspera['estado']): string {
    const clases: Record<PedidoEnEspera['estado'], string> = {
      'en-espera': 'text-bg-warning',
      'en-preparacion': 'text-bg-info',
      'por-cobrar': 'text-bg-success'
    };
    return clases[estado];
  }

  cambiarEstadoPedido(pedido: PedidoEnEspera, estado: PedidoEnEspera['estado']): void {
    this.pedidosEspera.actualizarEstado(pedido.id, estado);
  }

  private toOrderItems(): OrderItem[] {
    return this.cart.items.map(item => ({
      productId: item.producto.id,
      productName: item.producto.name,
      quantity: item.cantidad,
      unitPrice: item.producto.price
    }));
  }
}
