# MANILA — ProyectoFinalAngular

Aplicación Angular para la operación de un restaurante: catálogo de productos, pedidos,
inventario, proveedores, compras, empleados y reportes. La información operativa se
persiste en `localStorage` mediante `DatabaseService`.

## Desarrollo

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Compilación

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Pruebas unitarias

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
npm test -- --watch=false
```

## Flujos principales

- **Administración:** inventario, proveedores, compras, empleados y reportes.
- **Operación:** catálogo de comidas y bebidas, carrito, cierre de pedido e historial.
- **Persistencia:** el estado se guarda bajo la clave `manila-db-v3`; las migraciones
  normalizan identificadores y estados sin eliminar datos existentes.
- **Compras:** solo proveedores activos pueden asociarse a insumos o nuevas compras.
  Recibir una compra actualiza existencias y registra el movimiento de kardex una vez.
- **Inventario:** el estado disponible/escaso/agotado se calcula usando la cantidad y
  el mínimo configurable de cada insumo.

## End-to-end

Angular CLI no incluye un framework end-to-end por defecto. Los flujos manuales
principales se pueden verificar con `ng serve`; si se incorpora un framework E2E,
debe documentarse aquí su comando y sus datos de prueba.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
