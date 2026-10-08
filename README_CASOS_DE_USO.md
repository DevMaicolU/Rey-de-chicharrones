# Sistema POS y Gestión "MANILA" - Especificación Técnica y Casos de Uso (SRS)
**Lead Engineer:** Maicol Stiven Prieto Torres
**Arquitectura:** Angular 16+, Bootstrap 5 (UI Premium), Mock Backend (TypeScript + RxJS BehaviorSubjects).

## 📌 1. ESTRUCTURA DE DATOS REQUERIDA EN EL MOCK BACKEND
Para cumplir con los Casos de Uso, el `DatabaseService` debe mantener el estado global usando `BehaviorSubject` para las siguientes colecciones:
- `Users`: { id, name, username, password, role: 'admin' | 'empleado' }
- `Insumos`: { code, name, tax, type: 'carne' | 'lácteo' | 'otro', quantityUnits, quantityGrams, status: 'disponible' | 'escaso' | 'agotado' }
- `ActiveProducts` (Menú): Productos traídos de TheMealDB/TheCocktailDB habilitados por el Admin.
- `Orders`: { orderId, table, clientName, products: [], total, status, date, employeeId }
- `Providers`: { id, name, email }
- `Purchases` (Compras a proveedores): { purchaseId, providerId, date, items: [], total }

## 📋 2. DETALLE ESTRICTO DE CASOS DE USO (IMPLEMENTACIÓN OBLIGATORIA)

### MÓDULO A: SEGURIDAD Y USUARIOS (Actor: Administrador)
- [ ] **CU-01: Registrar un usuario.** 
  - *Flujo:* Formulario con Nombre, Usuario, Contraseña y Rol (Admin/Empleado). 
  - *Validación:* Verificar en `BehaviorSubject` si el `username` ya existe (RF-34). Mostrar alerta de error si existe; si no, guardar y actualizar tabla (RF-07).
- [ ] **CU-02: Iniciar sesión.** (Actor: Admin/Empleado).
  - *Flujo:* Validar credenciales contra la lista de usuarios. 
  - *Validación:* Mostrar mensajes de error específicos: "Usuario no existe" o "Contraseña incorrecta" (RF-30). Al entrar, redirigir según el rol y guardar la sesión activa.
- [ ] **CU-03: Actualizar dato de usuario.**
  - *Flujo:* Buscar por `username`. Mostrar datos en formulario. Guardar cambios y actualizar estado global (RF-49, RF-50).
- [ ] **CU-04: Eliminar usuario.**
  - *Flujo:* Buscar usuario. Mostrar modal de confirmación estricto ("¿Está seguro?") antes de hacer el borrado del `BehaviorSubject` (RF-51, RF-54).

### MÓDULO B: INVENTARIO DE INSUMOS (Actor: Administrador)
- [ ] **CU-05: Crear un insumo.** 
  - *Flujo:* Ingresar Código, Nombre, Impuesto y Tipo. 
  - *Validación:* Bloquear si el código ya existe (RF-33, RF-52). Guardar en estado global.
- [ ] **CU-06 y CU-07: Actualizar / Eliminar insumo.**
  - *Flujo:* Búsqueda por código de insumo. Si no existe, mostrar alerta (RF-43). Modal de confirmación para eliminar (RF-54).
- [ ] **CU-08: Consultar estado de insumos.**
  - *Flujo:* Tabla reactiva listando todos los insumos (Nombre, Cantidades, Estado).
  - *Lógica de Estado:* El sistema debe calcular el estado automáticamente: >20 = Disponible, 1 a 20 = Escaso (alerta naranja), 0 = Agotado (alerta roja) (RF-16, RF-24).

### MÓDULO C: VENTAS Y FACTURACIÓN (Actor: Empleado)
- [ ] **CU-09: Registrar un pedido.**
  - *Flujo:* Ingresar Mesa y Nombre de Cliente. Seleccionar productos del menú activo.
  - *Lógica Crítica:* Al confirmar el pedido, el sistema DEBE descontar lógicamente insumos del inventario de forma automática (RF-27). (Nota Técnica: Simular que cada producto consume 1 unidad de insumo genérico para cumplir el RF-12 de escasez).
- [ ] **CU-10: Pago y facturación electrónica.**
  - *Flujo:* Mostrar selector de método de pago (Efectivo, Crédito, Nequi, PSE). Casilla para aplicar descuento del 10% (RF-35, RF-36).
  - *Salida:* Renderizar una Factura Electrónica (estilo Ticket de venta) con NIT del restaurante, datos del cliente, desglose de productos, descuento y total (RF-04, RF-05, RF-08).

### MÓDULO D: REPORTES Y COMPRAS (Actor: Administrador)
- [ ] **CU-11: Generar reporte de ventas.**
  - *Flujo:* Selector de Fecha Inicial y Final (RF-46).
  - *Lógica:* Filtrar el array de pedidos completados y renderizar una tabla resumen con totales e ingresos. Si no hay ventas en la fecha, mostrar alerta (RF-25).
- [ ] **CU-12: Pedido a proveedores.**
  - *Flujo:* Seleccionar Proveedor de la lista. Añadir insumos y cantidades. Calcular total (RF-36) y emitir solicitud simulada (RF-38).
- [ ] **CU-13: Ingresar factura de compra a la base de datos.**
  - *Flujo:* Formulario de ingreso de inventario. El admin ingresa qué insumos compró y cantidades. 
  - *Lógica Crítica:* Al guardar, el sistema DEBE sumar esas cantidades matemáticas al stock de los insumos existentes en el `BehaviorSubject` (RF-21) y recalcular sus estados (Disponible/Escaso).