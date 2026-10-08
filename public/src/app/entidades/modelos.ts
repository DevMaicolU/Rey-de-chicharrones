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
  idApi: string;
  name: string;
  type: 'Comida' | 'Bebida';
  price: number;
  imageUrl: string | null;
  ingredients: string[];
  status: 'Activo';
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