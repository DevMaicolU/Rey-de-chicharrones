import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Order, Product, RecipeItem, User, OrderItem } from '../entidades/modelos';
import { FacturacionService, InvoiceCalculation } from './facturacion.service';

export type UnitOfMeasure = 'gramos' | 'unidades' | 'mililitros';
export type SupplyType = 'carne' | 'lácteo' | 'otro';
export type SupplyStatus = 'Disponible' | 'Escaso' | 'Agotado';
export type OrderStatus = 'pendiente' | 'completado' | 'cancelado';
export type PaymentMethod = 'efectivo' | 'crédito' | 'nequi' | 'pse';
export type PurchaseStatus = 'pedida' | 'recibida' | 'anulada';
export type StockMovementType = 'compra' | 'venta' | 'ajuste';

export interface Insumo {
  code: string;
  name: string;
  unitOfMeasure: UnitOfMeasure;
  quantity: number;
  status: SupplyStatus;
  averageCost: number;
  lastCost: number;
  minimumQuantity: number;
  preferredProviderId?: number;
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
  nit: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  active: boolean;
}

export interface PurchaseItem {
  supplyCode: string;
  supplyName: string;
  unitOfMeasure: UnitOfMeasure;
  packages: number;
  unitsPerPackage: number;
  packageCost: number;
  baseQuantity: number;
  costPerBaseUnit: number;
  subtotal: number;
}

export interface Purchase {
  purchaseId: number;
  providerId: number;
  providerName: string;
  invoiceNumber?: string;
  date: string;
  receivedDate?: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  total: number;
  notes?: string;
}

export interface StockMovement {
  id: number;
  date: string;
  supplyCode: string;
  type: StockMovementType;
  quantity: number;
  reference: string;
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
  stockMovements: StockMovement[];
  orders: OrderRecord[];
}

const STORAGE_KEY = 'manila-db-v3';

const DEFAULT_USERS: User[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
  { id: 2, username: 'empleado', password: 'empleado123', role: 'empleado', name: 'Empleado Principal' }
];

const DEFAULT_SUPPLIES: Insumo[] = [
  ...[
    ['PAN-001', 'Pan de hamburguesa', 'unidades'], ['CAR-001', 'Carne molida', 'gramos'],
    ['TOM-001', 'Tomate', 'gramos'], ['QUE-001', 'Queso', 'gramos'], ['PAP-001', 'Papas', 'gramos'],
    ['SAL-001', 'Salchicha', 'unidades'], ['CEB-001', 'Cebolla', 'gramos'], ['ARR-001', 'Arroz', 'gramos'],
    ['PAS-001', 'Pasta para lasagna', 'gramos'], ['LEC-001', 'Lechuga', 'gramos'], ['LIM-001', 'Zumo de limón', 'mililitros'],
    ['AGU-001', 'Agua', 'mililitros'], ['AZU-001', 'Azúcar', 'gramos'], ['VOD-001', 'Vodka', 'mililitros'],
    ['CER-001', 'Cerveza', 'mililitros'], ['TEQ-001', 'Tequila', 'mililitros'], ['VER-001', 'Vermut', 'mililitros'],
    ['GAS-001', 'Gaseosa', 'mililitros']
  ].map(([code, name, unitOfMeasure]) => ({
    code, name, unitOfMeasure: unitOfMeasure as UnitOfMeasure, quantity: 0,
    status: 'Agotado' as SupplyStatus, averageCost: 0, lastCost: 0, minimumQuantity: 20
  }))
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
  { id: 1, name: 'Multileches S.A.S.', nit: '900123456-7', contactName: 'Laura Gómez', phone: '3005550101', email: 'compras@multileches.example', address: 'Bogotá', active: true },
  { id: 2, name: 'Carnes La Central', nit: '901234567-8', contactName: 'Carlos Ruiz', phone: '3005550102', email: 'carnes@example.com', active: true }
];

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly facturacion = inject(FacturacionService);
  private readonly initialState = this.loadState();
  private readonly persistenceErrorSubject = new BehaviorSubject<string>('');

  private readonly usersSubject = new BehaviorSubject<User[]>(this.initialState.users);
  private readonly suppliesSubject = new BehaviorSubject<Insumo[]>(this.initialState.supplies);
  private readonly activeProductsSubject = new BehaviorSubject<ActiveProduct[]>(this.initialState.activeProducts);
  private readonly providersSubject = new BehaviorSubject<Provider[]>(this.initialState.providers);
  private readonly purchasesSubject = new BehaviorSubject<Purchase[]>(this.initialState.purchases);
  private readonly stockMovementsSubject = new BehaviorSubject<StockMovement[]>(this.initialState.stockMovements);
  private readonly ordersSubject = new BehaviorSubject<OrderRecord[]>(this.initialState.orders);

  readonly users$ = this.usersSubject.asObservable();
  readonly supplies$ = this.suppliesSubject.asObservable();
  readonly insumos$ = this.supplies$;
  readonly activeProducts$ = this.activeProductsSubject.asObservable();
  readonly providers$ = this.providersSubject.asObservable();
  readonly purchases$ = this.purchasesSubject.asObservable();
  readonly stockMovements$ = this.stockMovementsSubject.asObservable();
  readonly persistenceError$ = this.persistenceErrorSubject.asObservable();
  /** Observable compatible con las vistas existentes; cada elemento conserva los campos canónicos. */
  readonly orders$: Observable<Order[]> = this.ordersSubject.asObservable();
  readonly orderRecords$ = this.ordersSubject.asObservable();

  get users(): User[] { return this.usersSubject.value; }
  get supplies(): Insumo[] { return this.suppliesSubject.value; }
  get insumos(): Insumo[] { return this.supplies; }
  get activeProducts(): ActiveProduct[] { return this.activeProductsSubject.value; }
  get providers(): Provider[] { return this.providersSubject.value; }
  get purchases(): Purchase[] { return this.purchasesSubject.value; }
  get stockMovements(): StockMovement[] { return this.stockMovementsSubject.value; }
  get orders(): OrderRecord[] { return this.ordersSubject.value; }

  getProviderById(providerId: number): Provider | undefined {
    const id = this.normalizeProviderId(providerId);
    return id === undefined ? undefined : this.providers.find(provider => provider.id === id);
  }

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

  addSupply(input: Pick<Insumo, 'code' | 'name' | 'unitOfMeasure'> & Partial<Pick<Insumo, 'preferredProviderId'>>): Resultado {
    return this.addInsumo(input);
  }

  addInsumo(input: Pick<Insumo, 'code' | 'name' | 'unitOfMeasure'> & Partial<Pick<Insumo, 'preferredProviderId'>>): Resultado {
    const code = input.code.trim().toUpperCase();
    if (!code || !input.name.trim() || !['gramos', 'unidades', 'mililitros'].includes(input.unitOfMeasure)) {
      return { ok: false, error: 'Completa código, nombre y unidad de medida.' };
    }
    if (this.supplies.some(supply => supply.code === code)) return { ok: false, error: `El código "${code}" ya existe.` };
    const preferredProviderId = this.normalizeProviderId(input.preferredProviderId);
    const preferredProvider = this.validatePreferredProvider(preferredProviderId);
    if (preferredProvider) return preferredProvider;
    this.suppliesSubject.next([...this.supplies, this.withSupplyStatus({
      ...input,
      code,
      name: input.name.trim(),
      preferredProviderId,
      quantity: 0,
      minimumQuantity: 20,
      averageCost: 0,
      lastCost: 0
    })]);
    this.saveState();
    return { ok: true };
  }

  updateSupply(code: string, changes: Partial<Omit<Insumo, 'code' | 'status'>>): Resultado {
    return this.updateInsumo(code, changes);
  }

  updateInsumo(
    code: string,
    changes: Partial<Pick<Insumo, 'name' | 'unitOfMeasure' | 'preferredProviderId'>>
  ): Resultado {
    const normalizedCode = code.trim().toUpperCase();
    const current = this.supplies.find(supply => supply.code === normalizedCode);
    if (!current) {
      return { ok: false, error: 'El insumo no existe.' };
    }
    const nextName = changes.name?.trim() ?? current.name;
    const nextUnit = changes.unitOfMeasure ?? current.unitOfMeasure;
    if (!nextName || !['gramos', 'unidades', 'mililitros'].includes(nextUnit)) {
      return { ok: false, error: 'Los datos del insumo no son válidos.' };
    }
    const preferredProviderId = changes.preferredProviderId === undefined
      ? current.preferredProviderId
      : this.normalizeProviderId(changes.preferredProviderId);
    const preferredProvider = this.validatePreferredProvider(preferredProviderId);
    if (preferredProvider) return preferredProvider;
    this.suppliesSubject.next(this.supplies.map(supply => supply.code === normalizedCode
      ? this.withSupplyStatus({
        ...supply,
        name: nextName,
        unitOfMeasure: nextUnit,
        preferredProviderId
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
    if (this.activeProducts.some(product => product.recipe.some(item => item.insumoCode === normalizedCode))) {
      return { ok: false, error: 'El insumo está usado en una receta de producto.' };
    }
    if (this.purchases.some(purchase => purchase.items.some(item => item.supplyCode === normalizedCode)) ||
      this.stockMovements.some(movement => movement.supplyCode === normalizedCode)) {
      return { ok: false, error: 'El insumo tiene compras o movimientos registrados.' };
    }
    this.suppliesSubject.next(this.supplies.filter(supply => supply.code !== normalizedCode));
    this.saveState();
    return { ok: true };
  }

  addManualProduct(input: ManualProductInput): Resultado & { product?: ActiveProduct } {
    const validation = this.validateProductInput(input, true);
    if (!validation.ok || validation.name === undefined || validation.description === undefined || validation.price === undefined || validation.type === undefined || validation.recipe === undefined) {
      return validation;
    }
    const id = `manual-${this.slugify(validation.name)}-${Date.now()}`;
    const product: ActiveProduct = {
      id,
      name: validation.name,
      description: validation.description,
      price: validation.price,
      type: validation.type,
      imageUrl: validation.imageUrl ?? null,
      recipe: validation.recipe,
      source: 'manual',
      tax: input.tax ?? 0.19
    };
    this.activeProductsSubject.next([...this.activeProducts, product]);
    this.saveState();
    return { ok: true, product };
  }

  updateManualProduct(productId: string, input: ManualProductInput): Resultado & { product?: ActiveProduct } {
    const current = this.activeProducts.find(product => product.id === productId);
    if (!current) return { ok: false, error: 'El producto no existe.' };
    const validation = this.validateProductInput(input, false);
    if (!validation.ok || validation.name === undefined || validation.description === undefined || validation.price === undefined || validation.type === undefined || validation.recipe === undefined) {
      return validation;
    }
    const product: ActiveProduct = {
      ...current,
      name: validation.name,
      description: validation.description,
      price: validation.price,
      type: validation.type,
      imageUrl: validation.imageUrl ?? null,
      recipe: validation.recipe
    };
    this.activeProductsSubject.next(this.activeProducts.map(item => item.id === productId ? product : item));
    this.saveState();
    return { ok: true, product };
  }

  addActiveProduct(product: Product): void {
    const normalized = this.normalizeProduct(product);
    if (!normalized) return;
    if (!normalized.recipe.length || this.validateRecipe(normalized.recipe)) return;
    if (this.activeProducts.some(active => active.id === normalized.id)) return;
    this.activeProductsSubject.next([...this.activeProducts, {
      ...normalized,
      recipe: normalized.recipe.map(item => ({ ...item })),
      source: 'catalogo-local',
      tax: 0.19
    }]);
    this.saveState();
  }

  removeActiveProduct(productId: string): void {
    this.activeProductsSubject.next(this.activeProducts.filter(product => product.id !== productId));
    this.saveState();
  }

  addProvider(input: Omit<Provider, 'id' | 'active'>): Resultado {
    const provider = this.normalizeProviderInput(input);
    const validation = this.validateProvider(provider);
    if (validation) return { ok: false, error: validation };
    this.providersSubject.next([...this.providers, { ...provider, id: this.nextId(this.providers), active: true }]);
    this.saveState();
    return { ok: true };
  }

  updateProvider(id: number, changes: Partial<Omit<Provider, 'id' | 'active'>>): Resultado {
    const current = this.providers.find(provider => provider.id === id);
    if (!current) return { ok: false, error: 'El proveedor no existe.' };
    const next = this.normalizeProviderInput({ ...current, ...changes });
    const validation = this.validateProvider(next, id);
    if (validation) return { ok: false, error: validation };
    this.providersSubject.next(this.providers.map(provider => provider.id === id ? { ...provider, ...next } : provider));
    this.saveState();
    return { ok: true };
  }

  setProviderActive(id: number, active: boolean): Resultado {
    if (!this.providers.some(provider => provider.id === id)) return { ok: false, error: 'El proveedor no existe.' };
    this.providersSubject.next(this.providers.map(provider => provider.id === id ? { ...provider, active } : provider));
    this.saveState();
    return { ok: true };
  }

  deleteProvider(id: number): Resultado {
    if (!this.providers.some(provider => provider.id === id)) return { ok: false, error: 'El proveedor no existe.' };
    if (this.purchases.some(purchase => purchase.providerId === id)) {
      return { ok: false, error: 'Tiene compras registradas; desactívalo en lugar de eliminarlo.' };
    }
    this.providersSubject.next(this.providers.filter(provider => provider.id !== id));
    this.saveState();
    return { ok: true };
  }

  addOrder(order: Omit<Order, 'id' | 'createdAt'> & Partial<Pick<OrderRecord, 'status' | 'paymentMethod' | 'discountApplied' | 'subtotal' | 'discount'>>): void {
    this.persistOrder(order);
  }

  registrarVenta(input: VentaInput): VentaResultado {
    if (
      !Number.isInteger(input.tableNumber) ||
      input.tableNumber < 1 ||
      !input.customerName.trim() ||
      !Number.isInteger(input.employeeId) ||
      !input.employeeName.trim() ||
      !Array.isArray(input.items) ||
      input.items.length === 0 ||
      !this.facturacion.isPaymentMethod(input.paymentMethod)
    ) {
      return { ok: false, error: 'Los datos de la venta no son válidos.' };
    }

    const validatedItems: OrderItem[] = [];
    const consumption = new Map<string, number>();
    const seenProductIds = new Set<string>();

    for (const item of input.items) {
      if (!item || !item.productId || !item.productName?.trim()) {
        return { ok: false, error: 'Cada línea debe incluir un producto válido.' };
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return { ok: false, error: 'La cantidad de cada producto debe ser un entero positivo.' };
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        return { ok: false, error: `El precio del producto "${item.productName}" no es válido.` };
      }
      const product = this.activeProducts.find(candidate =>
        candidate.id === item.productId || candidate.idApi === item.productId
      );
      if (!product) {
        return { ok: false, error: `El producto "${item.productName}" no existe en el catálogo autorizado.` };
      }
      if (!product.recipe || !product.recipe.length) {
        return { ok: false, error: `El producto "${product.name}" no tiene una receta válida.` };
      }
      if (seenProductIds.has(product.id)) {
        return { ok: false, error: `El producto "${product.name}" se repite en la misma venta.` };
      }
      seenProductIds.add(product.id);

      const canonicalPrice = product.price;
      const validatedItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: canonicalPrice
      };
      validatedItems.push(validatedItem);

      for (const recipeItem of product.recipe) {
        if (!recipeItem || !recipeItem.insumoCode || !Number.isFinite(recipeItem.quantityNeeded) || recipeItem.quantityNeeded <= 0) {
          return { ok: false, error: `La receta de "${product.name}" contiene una cantidad inválida.` };
        }
        const supply = this.supplies.find(candidate => candidate.code === recipeItem.insumoCode);
        if (!supply) {
          return { ok: false, error: `El insumo "${recipeItem.insumoCode}" de la receta no existe.` };
        }
        const needed = recipeItem.quantityNeeded * item.quantity;
        consumption.set(supply.code, (consumption.get(supply.code) ?? 0) + needed);
      }
    }

    if (!validatedItems.length) {
      return { ok: false, error: 'La venta debe incluir al menos un producto válido.' };
    }

    const invoice = this.facturacion.calculate(validatedItems, input.applyDiscount);

    for (const [insumoCode, quantityNeeded] of consumption) {
      const supply = this.supplies.find(item => item.code === insumoCode);
      if (!supply) {
        return { ok: false, error: `El insumo "${insumoCode}" de la receta no existe.` };
      }
      if (!Number.isFinite(supply.quantity) || supply.quantity < 0 || supply.quantity < quantityNeeded) {
        return { ok: false, error: `No hay inventario suficiente de "${supply.name}".` };
      }
    }

    const updatedSupplies = this.supplies.map(supply => {
      const quantityNeeded = consumption.get(supply.code) ?? 0;
      return quantityNeeded > 0 ? this.withSupplyStatus({ ...supply, quantity: supply.quantity - quantityNeeded }) : supply;
    });

    const saleDate = new Date().toISOString();
    const stockEntries = [...consumption.entries()].map(([supplyCode, quantity], index) => ({
      id: this.nextId(this.stockMovements) + index,
      date: saleDate,
      supplyCode,
      type: 'venta' as const,
      quantity: -quantity,
      reference: `Pedido #${this.nextId(this.orders) + 1}`
    }));

    // En una operación de dominio coherente, primero se validan los datos y luego se confirma el estado completo.
    const order = this.persistOrder({
      tableNumber: input.tableNumber,
      customerName: input.customerName.trim(),
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      items: validatedItems,
      total: invoice.total,
      status: 'completado',
      paymentMethod: input.paymentMethod,
      discountApplied: invoice.discountApplied,
      subtotal: invoice.subtotal,
      discount: invoice.discount
    });

    const nextSupplies = this.supplies.map(supply => {
      const quantityNeeded = consumption.get(supply.code) ?? 0;
      return quantityNeeded > 0 ? this.withSupplyStatus({ ...supply, quantity: supply.quantity - quantityNeeded }) : supply;
    });

    this.suppliesSubject.next(nextSupplies);
    this.stockMovementsSubject.next([...this.stockMovements, ...stockEntries]);
    this.saveState();

    return { ok: true, invoice, order };
  }

  createPurchase(input: Omit<Purchase, 'purchaseId' | 'providerName' | 'status' | 'total' | 'receivedDate'>, receiveNow: boolean): Resultado & { purchase?: Purchase } {
    const provider = this.getProviderById(input.providerId);
    if (!provider || !provider.active) return { ok: false, error: 'Selecciona un proveedor activo.' };
    if (!input.items.length) return { ok: false, error: 'La compra debe tener al menos una línea.' };
    const normalizedItems: PurchaseItem[] = [];
    for (const item of input.items) {
      const supply = this.supplies.find(candidate => candidate.code === item.supplyCode.trim().toUpperCase());
      if (!supply) return { ok: false, error: `El insumo "${item.supplyCode}" no existe.` };
      if (!Number.isFinite(item.packages) || item.packages <= 0 ||
        !Number.isFinite(item.unitsPerPackage) || item.unitsPerPackage <= 0 ||
        !Number.isFinite(item.packageCost) || item.packageCost <= 0) {
        return { ok: false, error: 'Las cantidades y costos de la compra deben ser válidos.' };
      }
      const baseQuantity = item.packages * item.unitsPerPackage;
      const costPerBaseUnit = item.packageCost / item.unitsPerPackage;
      normalizedItems.push({
        supplyCode: supply.code, supplyName: supply.name, unitOfMeasure: supply.unitOfMeasure,
        packages: item.packages, unitsPerPackage: item.unitsPerPackage, packageCost: item.packageCost,
        baseQuantity, costPerBaseUnit, subtotal: item.packages * item.packageCost
      });
    }
    const purchase: Purchase = {
      ...input, providerId: provider.id, providerName: provider.name, status: receiveNow ? 'recibida' : 'pedida',
      purchaseId: this.nextId(this.purchases), date: input.date || new Date().toISOString(),
      items: normalizedItems, total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
      receivedDate: receiveNow ? new Date().toISOString() : undefined
    };
    this.purchasesSubject.next([...this.purchases, purchase]);
    if (receiveNow) this.applyPurchaseReceipt(purchase);
    this.saveState();
    return { ok: true, purchase };
  }

  receivePurchase(purchaseId: number, invoiceNumber?: string): Resultado {
    const purchase = this.purchases.find(item => item.purchaseId === purchaseId);
    if (!purchase) return { ok: false, error: 'La compra no existe.' };
    if (purchase.status !== 'pedida') return { ok: false, error: 'Solo se pueden recibir compras pedidas.' };
    const updated = { ...purchase, status: 'recibida' as PurchaseStatus, invoiceNumber: invoiceNumber?.trim() || purchase.invoiceNumber, receivedDate: new Date().toISOString() };
    this.purchasesSubject.next(this.purchases.map(item => item.purchaseId === purchaseId ? updated : item));
    this.applyPurchaseReceipt(updated);
    this.saveState();
    return { ok: true };
  }

  cancelPurchase(purchaseId: number): Resultado {
    const purchase = this.purchases.find(item => item.purchaseId === purchaseId);
    if (!purchase) return { ok: false, error: 'La compra no existe.' };
    if (purchase.status !== 'pedida') return { ok: false, error: 'Solo se pueden anular compras pedidas.' };
    this.purchasesSubject.next(this.purchases.map(item => item.purchaseId === purchaseId ? { ...item, status: 'anulada' } : item));
    this.saveState();
    return { ok: true };
  }

  adjustStock(code: string, newQuantity: number, reason: string): Resultado {
    const supply = this.supplies.find(item => item.code === code.trim().toUpperCase());
    if (!supply) return { ok: false, error: 'El insumo no existe.' };
    if (!Number.isFinite(newQuantity) || newQuantity < 0 || !reason.trim()) return { ok: false, error: 'Indica una cantidad válida y el motivo del ajuste.' };
    const difference = newQuantity - supply.quantity;
    this.suppliesSubject.next(this.supplies.map(item => item.code === supply.code ? this.withSupplyStatus({ ...item, quantity: newQuantity }) : item));
    this.stockMovementsSubject.next([...this.stockMovements, { id: this.nextId(this.stockMovements), date: new Date().toISOString(), supplyCode: supply.code, type: 'ajuste', quantity: difference, reference: `Ajuste: ${reason.trim()}` }]);
    this.saveState();
    return { ok: true };
  }

  purchasesByProvider(providerId: number): Purchase[] {
    return this.purchases.filter(purchase => purchase.providerId === providerId);
  }

  suppliesOfProvider(providerId: number): PurchaseItem[] {
    const latest = new Map<string, PurchaseItem>();
    for (const purchase of this.purchasesByProvider(providerId).filter(item => item.status === 'recibida')) {
      for (const item of purchase.items) latest.set(item.supplyCode, item);
    }
    return [...latest.values()];
  }

  providersOfSupply(code: string): Provider[] {
    const ids = new Set(this.purchases.filter(item => item.status === 'recibida')
      .filter(item => item.items.some(line => line.supplyCode === code)).map(item => item.providerId));
    return this.providers.filter(provider => ids.has(provider.id));
  }

  private applyPurchaseReceipt(purchase: Purchase): void {
    const now = new Date().toISOString();
    this.suppliesSubject.next(this.supplies.map(supply => {
      const lines = purchase.items.filter(item => item.supplyCode === supply.code);
      if (!lines.length) return supply;
      const addedQuantity = lines.reduce((sum, item) => sum + item.baseQuantity, 0);
      const addedValue = lines.reduce((sum, item) => sum + item.baseQuantity * item.costPerBaseUnit, 0);
      const averageCost = supply.quantity + addedQuantity
        ? (supply.quantity * supply.averageCost + addedValue) / (supply.quantity + addedQuantity)
        : 0;
      return this.withSupplyStatus({ ...supply, quantity: supply.quantity + addedQuantity, averageCost, lastCost: lines[lines.length - 1].costPerBaseUnit });
    }));
    const firstId = this.nextId(this.stockMovements);
    this.stockMovementsSubject.next([...this.stockMovements, ...purchase.items.map((item, index) => ({
      id: firstId + index, date: now, supplyCode: item.supplyCode, type: 'compra' as const,
      quantity: item.baseQuantity, reference: `Compra #${purchase.purchaseId}`
    }))]);
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
    const minimumQuantity = Number.isFinite(supply.minimumQuantity) && supply.minimumQuantity >= 0 ? supply.minimumQuantity : 20;
    const status: SupplyStatus = supply.quantity > minimumQuantity ? 'Disponible' : supply.quantity > 0 ? 'Escaso' : 'Agotado';
    return { ...supply, minimumQuantity, status };
  }

  private validatePreferredProvider(providerId: number | undefined): Resultado | undefined {
    if (providerId === undefined) return undefined;
    const provider = this.getProviderById(providerId);
    return provider?.active ? undefined : { ok: false, error: 'El proveedor preferido debe existir y estar activo.' };
  }

  private normalizeRecipe(recipe: unknown): RecipeItem[] {
    if (!Array.isArray(recipe)) return [];
    return recipe
      .filter((item): item is RecipeItem => !!item && typeof item === 'object' &&
        typeof (item as RecipeItem).insumoCode === 'string' &&
        Number.isFinite(Number((item as RecipeItem).quantityNeeded)) &&
        Number((item as RecipeItem).quantityNeeded) > 0)
      .map(item => ({ insumoCode: item.insumoCode.trim().toUpperCase(), quantityNeeded: Number(item.quantityNeeded) }));
  }

  private validateRecipe(recipe: RecipeItem[]): string | undefined {
    return this.validateRecipeAgainstSupplies(recipe, this.supplies);
  }

  private validateRecipeAgainstSupplies(recipe: RecipeItem[], supplies: Insumo[]): string | undefined {
    const seen = new Set<string>();
    for (const item of recipe) {
      if (!item.insumoCode || seen.has(item.insumoCode)) return `El insumo "${item.insumoCode}" está repetido en la receta.`;
      if (!supplies.some(supply => supply.code === item.insumoCode)) return `El insumo "${item.insumoCode}" de la receta no existe.`;
      seen.add(item.insumoCode);
    }
    return undefined;
  }

  private isUnitOfMeasure(value: unknown): value is UnitOfMeasure {
    return value === 'gramos' || value === 'unidades' || value === 'mililitros';
  }

  private normalizeProduct(product: Partial<Product> | null | undefined): ActiveProduct | undefined {
    if (!product || typeof product !== 'object') return undefined;
    const id = typeof product.id === 'string' && product.id.trim() ? product.id.trim() : undefined;
    const name = typeof product.name === 'string' ? product.name.trim() : '';
    if (!id || !name) return undefined;

    const recipe = this.normalizeRecipe(product.recipe);

    const taxSource = (product as Record<string, unknown>)['tax'];
    return {
      id,
      idApi: typeof product.idApi === 'string' ? product.idApi : id,
      name,
      description: typeof product.description === 'string' ? product.description.trim() : '',
      type: product.type === 'Comida' || product.type === 'Bebida' ? product.type : 'Comida',
      price: Number.isFinite(product.price) ? Number(product.price) : 0,
      imageUrl: typeof product.imageUrl === 'string' ? product.imageUrl : null,
      recipe,
      ingredients: Array.isArray(product.ingredients) ? product.ingredients.map(item => String(item)) : [],
      source: 'catalogo-local',
      status: product.status ?? 'Activo',
      tax: typeof taxSource === 'number' && Number.isFinite(taxSource) ? taxSource : 0.19
    };
  }

  private validateProductInput(input: Partial<ManualProductInput>, allowExisting: boolean): Resultado & { name?: string; description?: string; price?: number; type?: Product['type']; recipe?: RecipeItem[]; imageUrl?: string | null } {
    const name = input.name?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    const type = input.type ?? 'Comida';
    const price = Number(input.price);
    const recipe = this.normalizeRecipe(input.recipe);

    if (!name || !['Comida', 'Bebida'].includes(type)) {
      return { ok: false, error: 'El nombre y el tipo del producto son obligatorios.' };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, error: 'El precio del producto debe ser válido.' };
    }
    if (!recipe.length) {
      return { ok: false, error: 'La receta del producto debe incluir al menos un insumo.' };
    }
    const recipeError = this.validateRecipe(recipe);
    if (recipeError) return { ok: false, error: recipeError };
    if (allowExisting && this.activeProducts.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: `El producto "${name}" ya existe.` };
    }

    return {
      ok: true,
      name,
      description,
      price,
      type,
      recipe,
      imageUrl: input.imageUrl ?? null
    };
  }

  private loadState(): PersistedState {
    const fallback: PersistedState = {
      users: DEFAULT_USERS.map(user => ({ ...user })),
      supplies: DEFAULT_SUPPLIES.map(supply => ({ ...supply })),
      activeProducts: DEFAULT_PRODUCTS.map(product => ({ ...product, ingredients: [...(product.ingredients ?? [])] })),
      providers: DEFAULT_PROVIDERS.map(provider => ({ ...provider })),
      purchases: [],
      stockMovements: [],
      orders: []
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('manila-db-v2') ?? localStorage.getItem('manila-db-v1');
      if (!raw) return fallback;
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      if (!saved || typeof saved !== 'object') return fallback;

      const users = Array.isArray(saved.users) ? saved.users.filter((user): user is User => !!user && typeof user === 'object' && typeof user.username === 'string' && typeof user.password === 'string') : fallback.users;
      const supplies = Array.isArray(saved.supplies)
        ? saved.supplies
            .map((supply): Insumo | undefined => {
              if (!supply || typeof supply !== 'object') return undefined;
              const entry = supply as unknown as Partial<Insumo>;
              if (typeof entry.code !== 'string' || typeof entry.name !== 'string') return undefined;
              return this.withSupplyStatus({
                ...entry,
                code: String(entry.code).trim().toUpperCase(),
                name: String(entry.name).trim(),
                unitOfMeasure: this.isUnitOfMeasure(entry.unitOfMeasure) ? entry.unitOfMeasure : 'unidades',
                quantity: Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) >= 0 ? Number(entry.quantity) : 0,
                minimumQuantity: Number.isFinite(Number(entry.minimumQuantity)) && Number(entry.minimumQuantity) >= 0 ? Number(entry.minimumQuantity) : 20,
                averageCost: Number.isFinite(Number(entry.averageCost)) ? Number(entry.averageCost) : 0,
                lastCost: Number.isFinite(Number(entry.lastCost)) ? Number(entry.lastCost) : 0,
                preferredProviderId: this.normalizeProviderId(entry.preferredProviderId)
              });
            })
            .filter((supply): supply is Insumo => !!supply)
        : fallback.supplies;
      const activeProducts = Array.isArray(saved.activeProducts)
        ? saved.activeProducts
            .map((product): ActiveProduct | undefined => {
              if (!product || typeof product !== 'object') return undefined;
              const entry = product as unknown as Partial<Product>;
              if (typeof entry.id !== 'string' || typeof entry.name !== 'string') return undefined;
              return this.normalizeProduct(entry);
            })
            .filter((product): product is ActiveProduct => !!product)
        : fallback.activeProducts;
      const validProductIds = new Set<string>();
      const validatedProducts = activeProducts.filter(product => {
        const recipeError = !product.recipe.length
          ? 'La receta está vacía.'
          : this.validateRecipeAgainstSupplies(product.recipe, supplies);
        if (recipeError || validProductIds.has(product.id)) return false;
        validProductIds.add(product.id);
        return true;
      });
      const providers = Array.isArray(saved.providers)
        ? saved.providers
            .map((provider, index): Provider | undefined => {
              if (!provider || typeof provider !== 'object') return undefined;
              const entry = provider as unknown as Partial<Provider>;
              if (typeof entry.name !== 'string') return undefined;
              return this.normalizeProvider(entry, index + 1);
            })
            .filter((provider): provider is Provider => !!provider)
        : fallback.providers;
      for (const supply of supplies) {
        if (supply.preferredProviderId !== undefined &&
          !providers.some(provider => provider.id === supply.preferredProviderId && provider.active)) {
          supply.preferredProviderId = undefined;
        }
      }
      const purchases = Array.isArray(saved.purchases) ? saved.purchases
        .map((purchase, index) => this.normalizePurchase(
          purchase as Partial<Omit<Purchase, 'items'>> & { items?: Array<Partial<PurchaseItem> & { quantityUnits?: number; unitCost?: number }> },
          providers,
          supplies,
          index + 1
        ))
        .filter((purchase): purchase is Purchase => purchase !== undefined) : fallback.purchases;
      const stockMovements = Array.isArray(saved.stockMovements) ? saved.stockMovements.filter((movement): movement is StockMovement => !!movement && typeof movement === 'object' && typeof (movement as StockMovement).supplyCode === 'string' && typeof (movement as StockMovement).reference === 'string') : [];
      const orders = Array.isArray(saved.orders) ? saved.orders.map(order => this.normalizeOrder(order as OrderRecord)).filter((order): order is OrderRecord => !!order) : fallback.orders;

      const normalizedUsers = users.some(user => user.role === 'admin') ? users : [{ ...DEFAULT_USERS[0] }, ...users.filter(user => user.id !== DEFAULT_USERS[0].id)];
      return {
        users: normalizedUsers,
        supplies,
        activeProducts: validatedProducts,
        providers,
        purchases,
        stockMovements,
        orders
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
      stockMovements: this.stockMovements,
      orders: this.orders
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.persistenceErrorSubject.next('');
    } catch {
      this.persistenceErrorSubject.next('No se ha guardado de forma persistente la operación realizada.');
    }
  }

  private normalizeProvider(provider: Partial<Provider> | string, fallbackId: number): Provider {
    if (typeof provider === 'string') {
      const [name, email = ''] = provider.split(' - ');
      return { id: fallbackId, name: name.trim(), nit: '', contactName: '', phone: '', email: email.trim(), active: true };
    }
    const raw = provider as Partial<Provider> & { isActive?: unknown; activo?: unknown };
    const rawActive = raw.active ?? raw.isActive ?? raw.activo;
    const active = typeof rawActive === 'boolean'
      ? rawActive
      : typeof rawActive === 'string'
        ? ['true', 'activo', 'active', '1'].includes(rawActive.trim().toLowerCase())
        : false;
    return {
      id: this.normalizeProviderId(provider.id) ?? fallbackId, name: provider.name?.trim() ?? '', nit: provider.nit?.trim() ?? '',
      contactName: provider.contactName?.trim() ?? '', phone: provider.phone?.trim() ?? '',
      email: provider.email?.trim() ?? '', address: provider.address?.trim(), notes: provider.notes?.trim(), active
    };
  }

  private normalizeProviderInput(input: Omit<Provider, 'id' | 'active'>): Omit<Provider, 'id' | 'active'> {
    return { ...input, name: input.name.trim(), nit: input.nit.trim(), contactName: input.contactName.trim(), phone: input.phone.trim(), email: input.email.trim(), address: input.address?.trim(), notes: input.notes?.trim() };
  }

  private validateProvider(provider: Omit<Provider, 'id' | 'active'>, currentId?: number): string | undefined {
    if (!provider.name || !provider.nit || !provider.email) return 'Nombre, NIT y correo son obligatorios.';
    if (this.providers.some(item => item.id !== currentId && item.nit.toLowerCase() === provider.nit.toLowerCase())) return 'Ese NIT ya está registrado.';
    if (this.providers.some(item => item.id !== currentId && item.email.toLowerCase() === provider.email.toLowerCase())) return 'Ese correo ya está registrado.';
    return undefined;
  }

  private normalizePurchase(
    purchase: Partial<Omit<Purchase, 'items'>> & { items?: Array<Partial<PurchaseItem> & { quantityUnits?: number; unitCost?: number }> },
    providers: Provider[],
    supplies: Insumo[],
    fallbackPurchaseId: number
  ): Purchase | undefined {
    const providerId = this.normalizeProviderId(purchase.providerId);
    const provider = providerId === undefined ? undefined : providers.find(item => item.id === providerId);
    if (!provider || !purchase.items?.length) return undefined;
    const items = purchase.items.map(item => {
      const supply = supplies.find(candidate => candidate.code === item.supplyCode?.trim().toUpperCase());
      const packages = item.packages ?? item.quantityUnits ?? 0;
      const unitsPerPackage = item.unitsPerPackage ?? 1;
      const packageCost = item.packageCost ?? item.unitCost ?? 0;
      if (!supply) return undefined;
      return { supplyCode: supply.code, supplyName: supply.name, unitOfMeasure: supply.unitOfMeasure, packages, unitsPerPackage, packageCost, baseQuantity: packages * unitsPerPackage, costPerBaseUnit: packageCost / unitsPerPackage, subtotal: packages * packageCost };
    }).filter((item): item is PurchaseItem => item !== undefined);
    if (!items.length) return undefined;
    return { purchaseId: purchase.purchaseId ?? fallbackPurchaseId, providerId: provider.id, providerName: purchase.providerName ?? provider.name, invoiceNumber: purchase.invoiceNumber, date: purchase.date ?? new Date().toISOString(), receivedDate: purchase.receivedDate, status: purchase.status ?? 'recibida', items, total: items.reduce((sum, item) => sum + item.subtotal, 0), notes: purchase.notes };
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

  private slugify(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private nextId(items: Array<{ id?: number; purchaseId?: number; orderId?: number }>): number {
    const ids = items.map(item => item.id ?? item.purchaseId ?? item.orderId ?? 0);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  private normalizeProviderId(value: unknown): number | undefined {
    const id = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    return Number.isInteger(id) && id > 0 ? id : undefined;
  }
}
