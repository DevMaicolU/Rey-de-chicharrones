export type UserRole = 'admin' | 'empleado';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  type: 'Comida' | 'Bebida';
  price: number;
  imageUrl: string | null;
  recipe: RecipeItem[];
  /** @deprecated Se eliminará cuando se completen las vistas del catálogo. */
  idApi?: string;
  /** @deprecated La receta reemplaza esta lista de nombres libres. */
  ingredients?: string[];
  /** @deprecated Los productos locales siempre están disponibles. */
  status?: 'Activo';
}

export interface RecipeItem {
  insumoCode: string;
  quantityNeeded: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  tableNumber: number;
  customerName: string;
  employeeId: number;
  employeeName: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}