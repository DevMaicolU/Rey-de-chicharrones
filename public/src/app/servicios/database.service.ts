import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Order, Product, User, UserRole, OrderItem } from '../entidades/modelos';

export type SupplyType = 'carne' | 'lácteo' | 'otro';
export type SupplyStatus = 'disponible' | 'escaso' | 'agotado';
export type OrderStatus = 'pendiente' | 'completado' | 'cancelado';
export type PaymentMethod = 'efectivo' | 'crédito' | 'nequi' | 'pse';

export interface Insumo {
  code: string;
  name: string;
  tax: number;
  type: SupplyType;
  quantityUnits: number;
  quantityGrams: number;
  status: SupplyStatus;
}

export interface ActiveProduct extends Product {
  source: 'manual' | 'catalogo-local';
  tax: number;
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

export interface ManualProductInput {
  name: string;
  price: number;
  type: Product['type'];
  ingredients?: string[];
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
  { code: 'CAR-001', name: 'Carne de res', tax: 0, type: 'carne', quantityUnits: 35, quantityGrams: 35000, status: 'disponible' },
  { code: 'LAT-001', name: 'Queso mozzarella', tax: 0.19, type: 'lácteo', quantityUnits: 18, quantityGrams: 9000, status: 'escaso' },
  { code: 'OTR-001', name: 'Pan artesanal', tax: 0.19, type: 'otro', quantityUnits: 0, quantityGrams: 0, status: 'agotado' }
];

const DEFAULT_PRODUCTS: ActiveProduct[] = [
  {
    id: 'manual-hamburguesa-manila',
    idApi: 'manual-hamburguesa-manila',
    name: 'Hamburguesa Manila',
    type: 'Comida',
    price: 28000,
    imageUrl: '/Images/Comidas/1Lomo Saltado.jpg',
    ingredients: ['Carne de res', 'Pan artesanal', 'Queso mozzarella'],
    status: 'Activo',
    source: 'manual',
    tax: 0.19
  },
  {
    id: 'manual-limonada-natural',
    idApi: 'manual-limonada-natural',
    name: 'Limonada natural',
    type: 'Bebida',
    price: 9000,
    imageUrl: '/Images/Bebidas/5VirginMojito.jpg',
    ingredients: ['Limón', 'Agua', 'Azúcar'],
    status: 'Activo',
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
    const code = input.code.trim().toUpperCase();
    if (!code || !input.name.trim() || input.quantityUnits < 0 || input.quantityGrams < 0) {
      return { ok: false, error: 'Completa los datos del insumo con cantidades válidas.' };
    }
    if (this.supplies.some(supply => supply.code === code)) return { ok: false, error: `El código "${code}" ya existe.` };
    this.suppliesSubject.next([...this.supplies, this.withSupplyStatus({ ...input, code, name: input.name.trim() })]);
    this.saveState();
    return { ok: true };
  }

  updateSupply(code: string, changes: Partial<Omit<Insumo, 'code' | 'status'>>): Resultado {
    const normalizedCode = code.trim().toUpperCase();
    if (!this.supplies.some(supply => supply.code === normalizedCode)) return { ok: false, error: 'El insumo no existe.' };
    this.suppliesSubject.next(this.supplies.map(supply => supply.code === normalizedCode
      ? this.withSupplyStatus({ ...supply, ...changes, name: changes.name?.trim() ?? supply.name })
      : supply));
    this.saveState();
    return { ok: true };
  }

  deleteSupply(code: string): Resultado {
    const normalizedCode = code.trim().toUpperCase();
    if (!this.supplies.some(supply => supply.code === normalizedCode)) return { ok: false, error: 'El insumo no existe.' };
    this.suppliesSubject.next(this.supplies.filter(supply => supply.code !== normalizedCode));
    this.saveState();
    return { ok: true };
  }

  addManualProduct(input: ManualProductInput): Resultado & { product?: ActiveProduct } {
    const name = input.name.trim();
    if (!name || !Number.isFinite(input.price) || input.price <= 0) {
      return { ok: false, error: 'El nombre y el precio del producto son obligatorios.' };
    }
    const id = `manual-${this.slugify(name)}-${Date.now()}`;
    const product: ActiveProduct = {
      id,
      idApi: id,
      name,
      price: Math.round(input.price),
      type: input.type,
      imageUrl: input.imageUrl ?? null,
      ingredients: [...(input.ingredients ?? [])],
      status: 'Activo',
      source: 'manual',
      tax: input.tax ?? 0.19
    };
    this.activeProductsSubject.next([...this.activeProducts, product]);
    this.saveState();
    return { ok: true, product };
  }

  addActiveProduct(product: Product): void {
    if (this.activeProducts.some(active => active.idApi === product.idApi)) return;
    this.activeProductsSubject.next([...this.activeProducts, {
      ...product,
      ingredients: [...product.ingredients],
      source: 'catalogo-local',
      tax: 0.19
    }]);
    this.saveState();
  }

  removeActiveProduct(productId: string): void {
    this.activeProductsSubject.next(this.activeProducts.filter(product => product.idApi !== productId));
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
    const id = this.nextId(this.orders);
    const date = new Date().toISOString();
    const record: OrderRecord = {
      ...order,
      id,
      orderId: id,
      table: order.tableNumber,
      clientName: order.customerName,
      products: order.items,
      status: order.status ?? 'completado',
      date,
      createdAt: date
    };
    this.ordersSubject.next([...this.orders, record]);
    this.saveState();
  }

  addPurchase(purchase: Omit<Purchase, 'purchaseId' | 'date'>): Resultado {
    if (!purchase.items.length || purchase.total < 0) return { ok: false, error: 'La compra debe contener al menos un insumo.' };
    const record: Purchase = { ...purchase, purchaseId: this.nextId(this.purchases), date: new Date().toISOString() };
    this.purchasesSubject.next([...this.purchases, record]);
    this.suppliesSubject.next(this.supplies.map(supply => {
      const item = purchase.items.find(entry => entry.supplyCode === supply.code);
      return item ? this.withSupplyStatus({ ...supply, quantityUnits: supply.quantityUnits + item.quantityUnits }) : supply;
    }));
    this.saveState();
    return { ok: true };
  }

  private withSupplyStatus(supply: Omit<Insumo, 'status'>): Insumo {
    const status: SupplyStatus = supply.quantityUnits > 20 ? 'disponible' : supply.quantityUnits > 0 ? 'escaso' : 'agotado';
    return { ...supply, status };
  }

  private loadState(): PersistedState {
    const fallback: PersistedState = {
      users: DEFAULT_USERS.map(user => ({ ...user })),
      supplies: DEFAULT_SUPPLIES.map(supply => ({ ...supply })),
      activeProducts: DEFAULT_PRODUCTS.map(product => ({ ...product, ingredients: [...product.ingredients] })),
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
        activeProducts: Array.isArray(saved.activeProducts) ? saved.activeProducts : fallback.activeProducts,
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
