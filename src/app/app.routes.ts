import { Routes } from '@angular/router';
import { Login } from './login/login';
import { roleGuard } from './guards/role.guard';
import { EmpleadoLayout } from './empleado/empleado-layout';
import { AdminLayout } from './admin/admin-layout';
import { Comidas } from './comidas/comidas';
import { Bebidas } from './bebidas/bebidas';
import { NuevoPedido } from './empleado/nuevo-pedido';
import { Registros } from './empleado/registros';
import { Inventario } from './admin/inventario';
import { Proveedores } from './admin/proveedores';
import { Empleados } from './admin/empleados';
import { Reportes } from './admin/reportes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  {
    path: 'empleado', component: EmpleadoLayout, canActivate: [roleGuard('empleado')], children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedido' },
      { path: 'comidas', component: Comidas },
      { path: 'bebidas', component: Bebidas },
      { path: 'pedido', component: NuevoPedido },
      { path: 'registros', component: Registros }
    ]
  },
  {
    path: 'admin', component: AdminLayout, canActivate: [roleGuard('admin')], children: [
      { path: '', pathMatch: 'full', redirectTo: 'inventario' },
      { path: 'inventario', component: Inventario },
      { path: 'proveedores', component: Proveedores },
      { path: 'empleados', component: Empleados },
      { path: 'reportes', component: Reportes }
    ]
  },
  { path: '**', redirectTo: 'login' }
];