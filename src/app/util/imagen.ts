/** Imagen que se muestra cuando un producto no tiene foto o ésta no carga. */
export const IMAGEN_RESPALDO = '/Images/manila.jpg';

/** Logo oficial de RoyalSoft */
export const LOGO_OFICIAL = '/Images/LOGO_OFICIAL.jpeg';

/** Manejador `(error)` para <img>: cambia la imagen rota por la de respaldo (una sola vez). */
export function usarImagenRespaldo(event: Event): void {
  const imagen = event.target as HTMLImageElement;
  if (!imagen.src.endsWith(IMAGEN_RESPALDO)) {
    imagen.src = IMAGEN_RESPALDO;
  }
}

