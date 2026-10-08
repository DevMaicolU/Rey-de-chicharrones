import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Order, Product, RecipeItem, User, OrderItem } from '../entidades/modelos';
import { FacturacionService, InvoiceCalculation } from './facturacion.service';

export type UnitOfMeasure = 'gramos' | 'unidades' | 'mililitros';
export type SupplyType = 'carne' | 'lácteo' | 'otro';
export type SupplyStatus = 'Disponible' | 'Escaso' | 'Agotado';
export type OrderStatus = 'pendiente' | 'completado' | 'cancelado';
export type PaymentMethod = 'efectivo' | 'crédito' | 'nequi' | 'pse';

export interface Insumo {
  code: string;
  name: string;
  unitOfMeasure: UnitOfMeasure;
  quantity: number;
  status: SupplyStatus;
  /** @deprecated Compatibilidad con la vista de inventario existente. */
  quantityUnits?: number;
  /** @deprecated Compatibilidad con la vista de inventario existente. */
  quantityGrams?: number;
  /** @deprecated El inventario ya no calcula impuestos por insumo. */
  tax?: number;
  /** @deprecated La unidad de medida reemplaza la clasificación libre. */
  type?: SupplyType;
}

export interface ActiveProduct extends Product {
  source: 'manual' | 'catalogo-local';
  tax?: number;
}

export interface Provider {
  id: number;
  name: string;
  email: string;
}

export interface PurchaseItem {
  supplyCode: string;
  supplyName: string;
  quantityUnits: number;
  quantityGrams?: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  purchaseId: number;
  providerId: number;
  date: string;
  items: PurchaseItem[];
  total: number;
}

/** Forma canónica de un pedido en el mock backend. */
export interface OrderRecord extends Order {
  orderId: number;
  table: number;
  clientName: string;
  products: OrderItem[];
  status: OrderStatus;
  date: string;
  paymentMethod?: PaymentMethod;
  discountApplied?: boolean;
  subtotal?: number;
  discount?: number;
}

export interface Resultado {
  ok: boolean;
  error?: string;
}

export interface VentaInput {
  tableNumber: number;
  customerName: string;
  employeeId: number;
  employeeName: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  applyDiscount: boolean;
}

export interface VentaResultado extends Resultado {
  invoice?: InvoiceCalculation;
  order?: OrderRecord;
}

export interface ManualProductInput {
  name: string;
  description: string;
  price: number;
  type: Product['type'];
  recipe: RecipeItem[];
  imageUrl?: string | null;
  tax?: number;
}

interface PersistedState {
  users: User[];
  supplies: Insumo[];
  activeProducts: ActiveProduct[];
  providers: Provider[];
  purchases: Purchase[];
  orders: OrderRecord[];
}

const STORAGE_KEY = 'manila-db-v2';

const DEFAULT_USERS: User[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
  { id: 2, username: 'empleado', password: 'empleado123', role: 'empleado', name: 'Empleado Principal' }
];

const DEFAULT_SUPPLIES: Insumo[] = [
  { code: 'PAN-001', name: 'Pan de hamburguesa', unitOfMeasure: 'unidades', quantity: 1000, status: 'Disponible' },
  { code: 'CAR-001', name: 'Carne molida', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'TOM-001', name: 'Tomate', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'QUE-001', name: 'Queso', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'PAP-001', name: 'Papas', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'SAL-001', name: 'Salchicha', unitOfMeasure: 'unidades', quantity: 1000, status: 'Disponible' },
  { code: 'CEB-001', name: 'Cebolla', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'ARR-001', name: 'Arroz', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'PAS-001', name: 'Pasta para lasagna', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'LEC-001', name: 'Lechuga', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'LIM-001', name: 'Zumo de limón', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'AGU-001', name: 'Agua', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'AZU-001', name: 'Azúcar', unitOfMeasure: 'gramos', quantity: 1000, status: 'Disponible' },
  { code: 'VOD-001', name: 'Vodka', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'CER-001', name: 'Cerveza', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'TEQ-001', name: 'Tequila', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'VER-001', name: 'Vermut', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' },
  { code: 'GAS-001', name: 'Gaseosa', unitOfMeasure: 'mililitros', quantity: 1000, status: 'Disponible' }
];

const DEFAULT_PRODUCTS: ActiveProduct[] = [
  {
    id: 'comida-hamburguesa-clasica',
    name: 'Hamburguesa Clásica',
    description: 'Hamburguesa con carne, queso, tomate y cebolla.',
    type: 'Comida',
    price: 28000,
    imageUrl: '/Images/Comidas/hamburguesa.jpg',
    recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }, { insumoCode: 'CAR-001', quantityNeeded: 180 }, { insumoCode: 'QUE-001', quantityNeeded: 30 }, { insumoCode: 'TOM-001', quantityNeeded: 25 }, { insumoCode: 'CEB-001', quantityNeeded: 15 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'comida-perro-caliente',
    name: 'Perro Caliente',
    description: 'Pan con salchicha, cebolla y papas.',
    type: 'Comida',
    price: 16000,
    imageUrl: '/Images/Comidas/perro-caliente.jpg',
    recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }, { insumoCode: 'SAL-001', quantityNeeded: 1 }, { insumoCode: 'CEB-001', quantityNeeded: 20 }, { insumoCode: 'PAP-001', quantityNeeded: 80 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'comida-lomo-saltado',
    name: 'Lomo Saltado',
    description: 'Lomo salteado con arroz, tomate, cebolla y papas.',
    type: 'Comida',
    price: 32000,
    imageUrl: '/Images/Comidas/1Lomo Saltado.jpg',
    recipe: [{ insumoCode: 'CAR-001', quantityNeeded: 220 }, { insumoCode: 'ARR-001', quantityNeeded: 150 }, { insumoCode: 'TOM-001', quantityNeeded: 50 }, { insumoCode: 'CEB-001', quantityNeeded: 40 }, { insumoCode: 'PAP-001', quantityNeeded: 120 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'comida-lasagna',
    name: 'Lasagna',
    description: 'Lasagna de pasta, carne, queso y tomate.',
    type: 'Comida',
    price: 30000,
    imageUrl: '/Images/Comidas/lasagna.jpg',
    recipe: [{ insumoCode: 'PAS-001', quantityNeeded: 180 }, { insumoCode: 'CAR-001', quantityNeeded: 160 }, { insumoCode: 'QUE-001', quantityNeeded: 60 }, { insumoCode: 'TOM-001', quantityNeeded: 80 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'comida-ensalada',
    name: 'Ensalada',
    description: 'Ensalada fresca de lechuga, tomate y cebolla.',
    type: 'Comida',
    price: 14000,
    imageUrl: '/Images/Comidas/ensalada.jpg',
    recipe: [{ insumoCode: 'LEC-001', quantityNeeded: 100 }, { insumoCode: 'TOM-001', quantityNeeded: 60 }, { insumoCode: 'CEB-001', quantityNeeded: 20 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'bebida-limonada',
    name: 'Limonada',
    description: 'Limonada natural endulzada.',
    type: 'Bebida',
    price: 9000,
    imageUrl: '/Images/Bebidas/limonada.jpg',
    recipe: [{ insumoCode: 'LIM-001', quantityNeeded: 80 }, { insumoCode: 'AGU-001', quantityNeeded: 250 }, { insumoCode: 'AZU-001', quantityNeeded: 20 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'bebida-margarita',
    name: 'Margarita',
    description: 'Cóctel clásico de tequila y limón.',
    type: 'Bebida',
    price: 18000,
    imageUrl: '/Images/Bebidas/margarita.jpg',
    recipe: [{ insumoCode: 'TEQ-001', quantityNeeded: 50 }, { insumoCode: 'LIM-001', quantityNeeded: 30 }, { insumoCode: 'AZU-001', quantityNeeded: 10 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'bebida-cerveza',
    name: 'Cerveza',
    description: 'Cerveza fría.',
    type: 'Bebida',
    price: 8000,
    imageUrl: '/Images/Bebidas/cerveza.jpg',
    recipe: [{ insumoCode: 'CER-001', quantityNeeded: 330 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'bebida-old-fashioned',
    name: 'Old Fashioned',
    description: 'Cóctel de vermut y cítricos.',
    type: 'Bebida',
    price: 22000,
    imageUrl: '/Images/Bebidas/old-fashioned.jpg',
    recipe: [{ insumoCode: 'VOD-001', quantityNeeded: 60 }, { insumoCode: 'AZU-001', quantityNeeded: 8 }, { insumoCode: 'LIM-001', quantityNeeded: 10 }],
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'bebida-gaseosa',
    name: 'Gaseosa',
    description: 'Gaseosa servida fría.',
    type: 'Bebida',
    price: 6000,
    imageUrl: '/Images/Bebidas/gaseosa.jpg',
    recipe: [{ insumoCode: 'GAS-001', quantityNeeded: 330 }],
    source: 'manual',
    tax: 0.19
  }
];

const DEFAULT_PROVIDERS: Provider[] = [
  { id: 1, name: 'Carnes La Central', email: 'carnes@ejemplo.com' },
  { id: 2, name: 'Frutas El Huerto', email: 'frutas@ejemplo.com' }
];

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly facturacion = inject(FacturacionService);
  private readonly initialState = this.loadState();

  private readonly usersSubject = new BehaviorSubject<User[]>(this.initialState.users);
  private readonly suppliesSubject = new BehaviorSubject<Insumo[]>(this.initialState.supplies);
  private readonly activeProductsSubject = new BehaviorSubject<ActiveProduct[]>(this.initialState.activeProducts);
  private readonly providersSubject = new BehaviorSubject<Provider[]>(this.initialState.providers);
  private readonly purchasesSubject = new BehaviorSubject<Purchase[]>(this.initialState.purchases);
  private readonly ordersSubject = new BehaviorSubject<OrderRecord[]>(this.initialState.orders);

  readonly users$ = this.usersSubject.asObservable();
  readonly supplies$ = this.suppliesSubject.asObservable();
  readonly insumos$ = this.supplies$;
  readonly activeProducts$ = this.activeProductsSubject.asObservable();
  /** Fachada legada para la pantalla actual; el estado canónico sigue siendo Provider[]. */
  readonly providers$: Observable<string[]> = this.providersSubject.asObservable().pipe(
    map(providers => providers.map(provider => `${provider.name} - ${provider.email}`))
  );
  readonly purchases$ = this.purchasesSubject.asObservable();
  /** Observable compatible con las vistas existentes; cada elemento conserva los campos canónicos. */
  readonly orders$: Observable<Order[]> = this.ordersSubject.asObservable();
  readonly orderRecords$ = this.ordersSubject.asObservable();

  get users(): User[] { return this.usersSubject.value; }
  get supplies(): Insumo[] { return this.suppliesSubject.value; }
  get insumos(): Insumo[] { return this.supplies; }
  get activeProducts(): ActiveProduct[] { return this.activeProductsSubject.value; }
  get providers(): Provider[] { return this.providersSubject.value; }
  get purchases(): Purchase[] { return this.purchasesSubject.value; }
  get orders(): OrderRecord[] { return this.ordersSubject.value; }

  findUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  findUser(username: string, password: string): User | undefined {
    const normalizedUsername = username.trim().toLowerCase();
    return this.users.find(user => user.username.toLowerCase() === normalizedUsername && user.password === password);
  }

  userExists(id: number): boolean {
    return this.users.some(user => user.id === id);
  }

  addUser(user: Omit<User, 'id'>): Resultado {
    const username = user.username.trim();
    const name = user.name.trim();
    if (!username || !name || !user.password) return { ok: false, error: 'Completa usuario, nombre y contraseña.' };
    if (this.users.some(existing => existing.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, error: `El usuario "${username}" ya existe.` };
    }
    this.usersSubject.next([...this.users, { ...user, id: this.nextId(this.users), username, name }]);
    this.saveState();
    return { ok: true };
  }

  updateUser(id: number, changes: Partial<Pick<User, 'name' | 'username' | 'password' | 'role'>>): Resultado {
    const current = this.findUserById(id);
    if (!current) return { ok: false, error: 'El usuario no existe.' };
    const username = changes.username?.trim() ?? current.username;
    if (!username || !changes.name?.trim() && changes.name !== undefined) {
      return { ok: false, error: 'El nombre y el usuario son obligatorios.' };
    }
    if (this.users.some(user => user.id !== id && user.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, error: `El usuario "${username}" ya existe.` };
    }
    this.usersSubject.next(this.users.map(user => user.id === id ? {
      ...user,
      ...changes,
      username,
      name: changes.name?.trim() ?? user.name
    } : user));
    this.saveState();
    return { ok: true };
  }

  deleteUser(id: number): Resultado {
    const user = this.findUserById(id);
    if (!user) return { ok: false, error: 'El usuario no existe.' };
    if (user.role === 'admin' && this.users.filter(item => item.role === 'admin').length <= 1) {
      return { ok: false, error: 'No se puede eliminar al único administrador.' };
    }
    this.usersSubject.next(this.users.filter(item => item.id !== id));
    this.saveState();
    return { ok: true };
  }

  addSupply(input: Omit<Insumo, 'status'>): Resultado {
    return this.addInsumo(input);
  }

  addInsumo(input: Omit<Insumo, 'status'>): Resultado {
    const code = input.code.trim().toUpperCase();
    const quantity = input.quantity ?? input.quantityUnits ?? 0;
    const unitOfMeasure = input.unitOfMeasure ?? (input.quantityGrams ? 'gramos' : 'unidades');
    if (
      !code ||
      !input.name.trim() ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !['gramos', 'unidades', 'mililitros'].includes(unitOfMeasure)
    ) {
      return { ok: false, error: 'Completa los datos del insumo con cantidades válidas.' };
    }
    if (this.supplies.some(supply => supply.code === code)) return { ok: false, error: `El código "${code}" ya existe.` };
    this.suppliesSubject.next([...this.supplies, this.withSupplyStatus({
      ...input,
      code,
      name: input.name.trim(),
      unitOfMeasure,
      quantity
    })]);
    this.saveState();
    return { ok: true };
  }

  updateSupply(code: string, changes: Partial<Omit<Insumo, 'code' | 'status'>>): Resultado {
    return this.updateInsumo(code, changes);
  }

  updateInsumo(
    code: string,
    changes: Partial<Pick<Insumo, 'code' | 'name' | 'unitOfMeasure' | 'quantity'>>
  ): Resultado {
    const normalizedCode = code.trim().toUpperCase();
    const current = this.supplies.find(supply => supply.code === normalizedCode);
    if (!current) {
      return { ok: false, error: 'El insumo no existe.' };
    }
    const nextCode = changes.code?.trim().toUpperCase() ?? current.code;
    const nextName = changes.name?.trim() ?? current.name;
    const nextQuantity = changes.quantity ?? current.quantity;
    const nextUnit = changes.unitOfMeasure ?? current.unitOfMeasure;
    if (
      !nextCode ||
      !nextName ||
      !Number.isFinite(nextQuantity) ||
      nextQuantity < 0 ||
      !['gramos', 'unidades', 'mililitros'].includes(nextUnit)
    ) {
      return { ok: false, error: 'Los datos del insumo no son válidos.' };
    }
    if (nextCode !== current.code && this.supplies.some(supply => supply.code === nextCode)) {
      return { ok: false, error: `El código "${nextCode}" ya existe.` };
    }
    this.suppliesSubject.next(this.supplies.map(supply => supply.code === normalizedCode
      ? this.withSupplyStatus({
        ...supply,
        code: nextCode,
        name: nextName,
        unitOfMeasure: nextUnit,
        quantity: nextQuantity
      })
      : supply));
    this.saveState();
    return { ok: true };
  }

  deleteSupply(code: string): Resultado {
    return this.deleteInsumo(code);
  }

  deleteInsumo(code: string): Resultado {
    const normalizedCode = code.trim().toUpperCase();
    if (!this.supplies.some(supply => supply.code === normalizedCode)) return { ok: false, error: 'El insumo no existe.' };
    this.suppliesSubject.next(this.supplies.filter(supply => supply.code !== normalizedCode));
    this.saveState();
    return { ok: true };
  }

  addManualProduct(input: ManualProductInput): Resultado & { product?: ActiveProduct } {
    const name = input.name.trim();
    const description = input.description.trim();
    if (!name || !description || !Number.isFinite(input.price) || input.price <= 0 || !input.recipe.length) {
      return { ok: false, error: 'Completa nombre, descripción, precio y al menos un insumo en la receta.' };
    }
    const id = `manual-${this.slugify(name)}-${Date.now()}`;
    const product: ActiveProduct = {
      id,
      name,
      description,
      price: Math.round(input.price),
      type: input.type,
      imageUrl: input.imageUrl ?? null,
      recipe: input.recipe.map(item => ({ ...item })),
      source: 'manual',
      tax: input.tax ?? 0.19
    };
    this.activeProductsSubject.next([...this.activeProducts, product]);
    this.saveState();
    return { ok: true, product };
  }

  addActiveProduct(product: Product): void {
    if (this.activeProducts.some(active => active.id === product.id)) return;
    this.activeProductsSubject.next([...this.activeProducts, {
      ...product,
      recipe: product.recipe.map(item => ({ ...item })),
      source: 'catalogo-local',
      tax: 0.19
    }]);
    this.saveState();
  }

  removeActiveProduct(productId: string): void {
    this.activeProductsSubject.next(this.activeProducts.filter(product => product.id !== productId));
    this.saveState();
  }

  addProvider(nameOrProvider: string | Omit<Provider, 'id'>): Resultado {
    const provider = typeof nameOrProvider === 'string'
      ? this.parseProvider(nameOrProvider)
      : { name: nameOrProvider.name.trim(), email: nameOrProvider.email.trim() };
    if (!provider.name || !provider.email) return { ok: false, error: 'El nombre y correo del proveedor son obligatorios.' };
    if (this.providers.some(item => item.email.toLowerCase() === provider.email.toLowerCase())) {
      return { ok: false, error: 'Ese proveedor ya está registrado.' };
    }
    this.providersSubject.next([...this.providers, { ...provider, id: this.nextId(this.providers) }]);
    this.saveState();
    return { ok: true };
  }

  deleteProvider(idOrProvider: number | Provider | string): Resultado {
    const id = typeof idOrProvider === 'number'
      ? idOrProvider
      : typeof idOrProvider === 'string'
        ? this.providers.find(provider => `${provider.name} - ${provider.email}` === idOrProvider)?.id
        : idOrProvider.id;
    if (id === undefined) return { ok: false, error: 'El proveedor no existe.' };
    if (!this.providers.some(provider => provider.id === id)) return { ok: false, error: 'El proveedor no existe.' };
    this.providersSubject.next(this.providers.filter(provider => provider.id !== id));
    this.saveState();
    return { ok: true };
  }

  addOrder(order: Omit<Order, 'id' | 'createdAt'> & Partial<Pick<OrderRecord, 'status' | 'paymentMethod' | 'discountApplied' | 'subtotal' | 'discount'>>): void {
    this.persistOrder(order);
  }

  /**
   * Registra una venta completa. Las existencias se validan y descuentan antes
   * de publicar el pedido para evitar ventas guardadas sin movimiento de stock.
   */
  registrarVenta(input: VentaInput): VentaResultado {
    if (
      !Number.isInteger(input.tableNumber) ||
      input.tableNumber < 1 ||
      !input.customerName.trim() ||
      !Number.isInteger(input.employeeId) ||
      !input.employeeName.trim() ||
      !input.items.length ||
      !this.facturacion.isPaymentMethod(input.paymentMethod)
    ) {
      return { ok: false, error: 'Los datos de la venta no son válidos.' };
    }

    const invoice = this.facturacion.calculate(input.items, input.applyDiscount);
    const consumption = new Map<string, number>();

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return { ok: false, error: 'La cantidad de cada producto debe ser un entero positivo.' };
      }

      const product = this.activeProducts.find(candidate =>
        candidate.id === item.productId || candidate.idApi === item.productId
      );
      if (!product || !product.recipe.length) {
        return { ok: false, error: `El producto "${item.productName}" no tiene una receta válida.` };
      }

      for (const recipeItem of product.recipe) {
        if (!Number.isFinite(recipeItem.quantityNeeded) || recipeItem.quantityNeeded <= 0) {
          return { ok: false, error: `La receta de "${product.name}" contiene una cantidad inválida.` };
        }
        consumption.set(
          recipeItem.insumoCode,
          (consumption.get(recipeItem.insumoCode) ?? 0) + recipeItem.quantityNeeded * item.quantity
        );
      }
    }

    for (const [insumoCode, quantityNeeded] of consumption) {
      const supply = this.supplies.find(item => item.code === insumoCode);
      if (!supply) {
        return { ok: false, error: `El insumo "${insumoCode}" de la receta no existe.` };
      }
      if (supply.quantity < quantityNeeded) {
        return { ok: false, error: `No hay inventario suficiente de "${supply.name}".` };
      }
    }

    this.suppliesSubject.next(this.supplies.map(supply => {
      const quantityNeeded = consumption.get(supply.code) ?? 0;
      return quantityNeeded
        ? this.withSupplyStatus({ ...supply, quantity: supply.quantity - quantityNeeded })
        : supply;
    }));

    const order = this.persistOrder({
      tableNumber: input.tableNumber,
      customerName: input.customerName.trim(),
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      items: input.items.map(item => ({ ...item })),
      total: invoice.total,
      status: 'completado',
      paymentMethod: input.paymentMethod,
      discountApplied: invoice.discountApplied,
      subtotal: invoice.subtotal,
      discount: invoice.discount
    });

    return { ok: true, invoice, order };
  }

  addPurchase(purchase: Omit<Purchase, 'purchaseId' | 'date'>): Resultado {
    if (
      !purchase.items.length ||
      !Number.isFinite(purchase.total) ||
      purchase.total < 0 ||
      !this.providers.some(provider => provider.id === purchase.providerId) ||
      purchase.items.some(item =>
        !item.supplyCode.trim() ||
        !Number.isInteger(item.quantityUnits) ||
        item.quantityUnits <= 0 ||
        !Number.isFinite(item.unitCost) ||
        item.unitCost < 0 ||
        !Number.isFinite(item.subtotal) ||
        item.subtotal < 0
      )
    ) {
      return { ok: false, error: 'La compra debe contener un proveedor y al menos un insumo válido.' };
    }
    const supplyCodes = new Set(this.supplies.map(supply => supply.code));
    if (purchase.items.some(item => !supplyCodes.has(item.supplyCode.trim().toUpperCase()))) {
      return { ok: false, error: 'La compra contiene un insumo que no existe.' };
    }
    const normalizedItems = purchase.items.map(item => ({
      ...item,
      supplyCode: item.supplyCode.trim().toUpperCase(),
      supplyName: item.supplyName.trim()
    }));
    const record: Purchase = {
      ...purchase,
      items: normalizedItems,
      purchaseId: this.nextId(this.purchases),
      date: new Date().toISOString()
    };
    this.purchasesSubject.next([...this.purchases, record]);
    this.suppliesSubject.next(this.supplies.map(supply => {
      const item = normalizedItems.find(entry => entry.supplyCode === supply.code);
      return item ? this.withSupplyStatus({
        ...supply,
        quantity: supply.quantity + item.quantityUnits
      }) : supply;
    }));
    this.saveState();
    return { ok: true };
  }

  private persistOrder(
    order: Omit<Order, 'id' | 'createdAt'> &
      Partial<Pick<OrderRecord, 'status' | 'paymentMethod' | 'discountApplied' | 'subtotal' | 'discount'>>
  ): OrderRecord {
    const id = this.nextId(this.orders);
    const date = new Date().toISOString();
    const record: OrderRecord = {
      ...order,
      id,
      orderId: id,
      table: order.tableNumber,
      clientName: order.customerName,
      products: order.items.map(item => ({ ...item })),
      status: order.status ?? 'completado',
      date,
      createdAt: date
    };
    this.ordersSubject.next([...this.orders, record]);
    this.saveState();
    return record;
  }

  private withSupplyStatus(supply: Omit<Insumo, 'status'>): Insumo {
    const status: SupplyStatus = supply.quantity > 20 ? 'Disponible' : supply.quantity > 0 ? 'Escaso' : 'Agotado';
    return { ...supply, status };
  }

  private loadState(): PersistedState {
    const fallback: PersistedState = {
      users: DEFAULT_USERS.map(user => ({ ...user })),
      supplies: DEFAULT_SUPPLIES.map(supply => ({ ...supply })),
      activeProducts: DEFAULT_PRODUCTS.map(product => ({ ...product, ingredients: [...(product.ingredients ?? [])] })),
      providers: DEFAULT_PROVIDERS.map(provider => ({ ...provider })),
      purchases: [],
      orders: []
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('manila-db-v1');
      if (!raw) return fallback;
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      const users = Array.isArray(saved.users) ? saved.users : fallback.users;
      return {
        users: users.some(user => user.role === 'admin') ? users : [{ ...DEFAULT_USERS[0] }, ...users],
        supplies: Array.isArray(saved.supplies) ? saved.supplies.map(supply => this.withSupplyStatus(supply)) : fallback.supplies,
        activeProducts: Array.isArray(saved.activeProducts) ? saved.activeProducts.map(product => ({
          ...product,
          description: product.description ?? '',
          recipe: product.recipe ?? [],
          ingredients: [...(product.ingredients ?? [])]
        })) : fallback.activeProducts,
        providers: Array.isArray(saved.providers) ? saved.providers.map(provider => this.normalizeProvider(provider)) : fallback.providers,
        purchases: Array.isArray(saved.purchases) ? saved.purchases : fallback.purchases,
        orders: Array.isArray(saved.orders) ? saved.orders.map(order => this.normalizeOrder(order)) : fallback.orders
      };
    } catch {
      return fallback;
    }
  }

  private saveState(): void {
    const state: PersistedState = {
      users: this.users,
      supplies: this.supplies,
      activeProducts: this.activeProducts,
      providers: this.providers,
      purchases: this.purchases,
      orders: this.orders
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* El estado en memoria sigue siendo válido. */ }
  }

  private normalizeProvider(provider: Provider | string): Provider {
    if (typeof provider !== 'string') return provider;
    const parsed = this.parseProvider(provider);
    return { ...parsed, id: this.nextId(this.providersSubject.value) };
  }

  private normalizeOrder(order: OrderRecord): OrderRecord {
    return {
      ...order,
      orderId: order.orderId ?? order.id,
      table: order.table ?? order.tableNumber,
      clientName: order.clientName ?? order.customerName,
      products: order.products ?? order.items,
      status: order.status ?? 'completado',
      date: order.date ?? order.createdAt
    };
  }

  private parseProvider(value: string): Omit<Provider, 'id'> {
    const [name, email = ''] = value.split(' - ');
    return { name: name.trim(), email: email.trim() };
  }

  private slugify(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private nextId(items: Array<{ id?: number; purchaseId?: number; orderId?: number }>): number {
    const ids = items.map(item => item.id ?? item.purchaseId ?? item.orderId ?? 0);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }
}
