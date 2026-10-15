import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
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
  templateUrl: './nuevo-pedido.html',
  styles: [`
    .modal-table-scroll {
      max-height: 300px;
      overflow-y: auto;
    }
    .modal-table-scroll thead th {
      position: sticky;
      top: 0;
      background-color: #f8f9fa;
      z-index: 2;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .autocomplete-dropdown {
      max-height: 270px;
      overflow-y: auto;
      z-index: 1065;
      box-shadow: 0 8px 24px rgba(127, 21, 37, 0.15);
    }
    .autocomplete-item:hover {
      background-color: #fff5f5;
    }
  `]
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
  busquedaMenu = '';
  mostrarDropdownMenu = false;
  readonly menu = toSignal(this.database.activeProducts$, { initialValue: this.database.activeProducts });

  // --- Fase C: Modal de cobro ---
  modalCobroVisible = signal(false);
  pedidoACobrar: PedidoEnEspera | null = null;
  paymentMethod: PaymentMethod = 'efectivo';
  applyDiscount = false;
  montoRecibido: number | null = null;
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

  vuelto(): number {
    if (this.montoRecibido === null || this.montoRecibido === undefined || Number.isNaN(this.montoRecibido)) {
      return 0;
    }
    return Math.max(0, this.montoRecibido - this.totalCobro());
  }

  pagoValido(): boolean {
    if (this.paymentMethod !== 'efectivo') {
      return true;
    }
    return (
      this.montoRecibido !== null &&
      Number.isFinite(this.montoRecibido) &&
      this.montoRecibido >= this.totalCobro()
    );
  }

  fijarMontoExacto(): void {
    this.montoRecibido = this.totalCobro();
  }

  fijarMonto(valor: number): void {
    this.montoRecibido = valor;
  }

  billetesSugeridos(): number[] {
    const total = this.totalCobro();
    const denominaciones = [2000, 5000, 10000, 20000, 50000, 100000];
    return denominaciones.filter(d => d > total);
  }

  onPaymentMethodChange(): void {
    this.montoRecibido = null;
  }

  onDiscountChange(): void {
    // En métodos electrónicos no se requiere monto recibido; en efectivo el usuario ingresa el monto
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

    const pedidoMesaExistente = this.pedidosEspera.buscarPedidoEnCursoPorMesa(mesa);
    if (pedidoMesaExistente) {
      const estado = this.etiquetaEstado(pedidoMesaExistente.estado);
      this.error = `Ya existe un pedido en curso para la Mesa ${mesa} (${estado}, cliente: ${pedidoMesaExistente.cliente}). No se pueden registrar pedidos simultáneos para la misma mesa.`;
      this.toast.advertencia(this.error);
      return;
    }

    const pedidoCedulaExistente = this.pedidosEspera.buscarPedidoEnCursoPorCedula(this.customerCedula.trim());
    if (pedidoCedulaExistente) {
      const estado = this.etiquetaEstado(pedidoCedulaExistente.estado);
      this.error = `El cliente con cédula ${this.customerCedula.trim()} ya tiene un pedido en curso en la Mesa ${pedidoCedulaExistente.mesa} (${estado}). No se pueden registrar pedidos simultáneos con la misma cédula.`;
      this.toast.advertencia(this.error);
      return;
    }

    const resultadoDescuento = this.database.descontarStockPorPedido(
      cartItems,
      `Pedido Mesa #${mesa} - ${this.customerName.trim()}`
    );
    if (!resultadoDescuento.ok) {
      this.error = resultadoDescuento.error ?? 'No hay existencias suficientes para registrar el pedido.';
      this.toast.error(this.error);
      return;
    }

    const pedido = this.pedidosEspera.registrar(mesa, this.customerName, this.customerCedula, cartItems);
    this.cart.limpiarCarrito();
    this.tableNumber = null;
    this.customerName = '';
    this.customerCedula = '';
    this.error = '';
    this.toast.exito(`¡Pedido de mesa ${pedido.mesa} registrado e inventario descontado!`);
  }

  /** Alias de compatibilidad para integraciones y pruebas que usaban el nombre anterior. */
  finalizarPedido(): void {
    // Compatibilidad con integraciones antiguas; la UI nueva exige la cédula explícita.
    if (!this.customerCedula.trim()) this.customerCedula = '000000';
    const employee = this.auth.activeUser;
    const cartItems = this.cart.items;
    const mesa = this.tableNumber;
    if (employee && mesa && Number.isInteger(mesa) && mesa >= 1 && this.customerName.trim() && cartItems.length) {
      const orderItems: OrderItem[] = cartItems.map(item => ({
        productId: item.producto.id,
        productName: item.producto.name,
        quantity: item.cantidad,
        unitPrice: item.producto.price
      }));
      const resultado = this.database.registrarVenta({
        tableNumber: mesa,
        customerName: this.customerName.trim(),
        customerCedula: this.customerCedula,
        employeeId: employee.id,
        employeeName: employee.name,
        items: orderItems,
        paymentMethod: 'efectivo',
        applyDiscount: false
      });
      if (resultado.ok) {
        this.cart.limpiarCarrito();
        this.tableNumber = null;
        this.customerName = '';
        this.customerCedula = '';
        this.error = '';
        void this.router.navigateByUrl('/empleado/registros');
        return;
      }
    }
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
    this.busquedaMenu = '';
    this.mostrarDropdownMenu = false;
  }

  cerrarEdicion(): void {
    this.pedidoEditando = null;
    this.itemsEditando = [];
    this.busquedaMenu = '';
    this.mostrarDropdownMenu = false;
  }

  abrirDropdownMenu(): void {
    this.mostrarDropdownMenu = true;
  }

  cerrarDropdownMenu(): void {
    this.mostrarDropdownMenu = false;
  }

  limpiarBusqueda(): void {
    this.busquedaMenu = '';
  }

  onBlurDropdownMenu(): void {
    setTimeout(() => {
      this.mostrarDropdownMenu = false;
    }, 200);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mostrarDropdownMenu) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.autocomplete-container')) {
      this.mostrarDropdownMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.mostrarDropdownMenu) {
      this.mostrarDropdownMenu = false;
    }
  }

  productosFiltradosComida(): Product[] {
    const query = this.busquedaMenu.trim().toLowerCase();
    return this.menu().filter(p => p.type === 'Comida' && (!query || p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)));
  }

  productosFiltradosBebida(): Product[] {
    const query = this.busquedaMenu.trim().toLowerCase();
    return this.menu().filter(p => p.type === 'Bebida' && (!query || p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)));
  }

  tieneResultadosBusqueda(): boolean {
    return this.productosFiltradosComida().length > 0 || this.productosFiltradosBebida().length > 0;
  }

  tieneStock(producto: Product): boolean {
    const actual = this.itemsEditando.find(item => item.producto.id === producto.id);
    const reservado = actual?.cantidad ?? 0;
    return this.database.stockSuficiente(producto, 1, reservado);
  }

  seleccionarProductoAutocomplete(producto: Product): void {
    this.agregarProductoEdicion(producto);
    this.busquedaMenu = '';
    this.mostrarDropdownMenu = false;
  }

  cambiarCantidadEdicion(item: CartItem, cantidad: number): void {
    if (Number.isNaN(cantidad) || !Number.isFinite(cantidad)) return;
    const cant = Math.max(1, Math.floor(cantidad));
    if (!this.database.stockSuficiente(item.producto, cant)) {
      this.toast.advertencia(`Stock insuficiente de insumos para preparar "${item.producto.name}".`);
      this.itemsEditando = [...this.itemsEditando];
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
      this.toast.advertencia(`Stock insuficiente de insumos para preparar "${producto.name}".`);
      return;
    }
    if (actual) {
      this.cambiarCantidadEdicion(actual, actual.cantidad + 1);
    } else {
      this.itemsEditando = [...this.itemsEditando, { producto, cantidad: 1, subtotal: producto.price }];
    }
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
    const ajuste = this.database.ajustarStockPorEdicionPedido(
      this.pedidoEditando.items,
      this.itemsEditando,
      `Ajuste Mesa #${this.pedidoEditando.mesa}`
    );
    if (!ajuste.ok) {
      this.toast.error(ajuste.error ?? 'Inventario insuficiente para aplicar los cambios del pedido.');
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
    this.database.restaurarStockPorPedido(
      this.pedidoACancelar.items,
      `Cancelación Pedido Mesa #${mesa}`
    );
    this.pedidosEspera.eliminar(this.pedidoACancelar.id);
    this.cerrarCancelacion();
    this.toast.info(`Pedido de mesa ${mesa} cancelado y existencias devueltas al inventario.`);
  }

  // ======================= Fase C: Cobro =======================
  abrirCobro(pedido: PedidoEnEspera): void {
    this.pedidoACobrar = pedido;
    this.paymentMethod = 'efectivo';
    this.applyDiscount = false;
    this.montoRecibido = null;
    this.errorCobro = '';
    this.modalCobroVisible.set(true);
  }

  cerrarCobro(): void {
    this.pedidoACobrar = null;
    this.montoRecibido = null;
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

    if (!this.pagoValido()) {
      const faltante = this.totalCobro() - (this.montoRecibido ?? 0);
      this.errorCobro = `El monto recibido no puede ser menor al total a cobrar. Faltan ${faltante.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}.`;
      return;
    }

    const orderItems: OrderItem[] = pedido.items.map(item => ({
      productId: item.producto.id,
      productName: item.producto.name,
      quantity: item.cantidad,
      unitPrice: item.producto.price
    }));

    const isEfectivo = this.paymentMethod === 'efectivo';
    const montoFinal = isEfectivo ? (this.montoRecibido ?? this.totalCobro()) : this.totalCobro();
    const vueltoFinal = isEfectivo ? this.vuelto() : 0;

    const resultado = this.database.registrarVenta({
      tableNumber: pedido.mesa,
      customerName: pedido.cliente,
      customerCedula: pedido.cedulaCliente,
      employeeId: employee.id,
      employeeName: employee.name,
      items: orderItems,
      paymentMethod: this.paymentMethod,
      applyDiscount: this.applyDiscount,
      stockAlreadyDeducted: true,
      amountPaid: isEfectivo ? montoFinal : undefined,
      change: isEfectivo ? vueltoFinal : undefined
    });

    if (!resultado.ok) {
      this.errorCobro = resultado.error ?? 'No fue posible registrar la venta.';
      return;
    }

    this.pedidosEspera.eliminar(pedido.id);
    this.cerrarCobro();
    if (isEfectivo && vueltoFinal > 0) {
      this.toast.exito(`¡Pedido de mesa ${pedido.mesa} cobrado exitosamente! Cambio a entregar: ${vueltoFinal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`);
    } else {
      this.toast.exito(`¡Pedido de mesa ${pedido.mesa} cobrado exitosamente!`);
    }
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
