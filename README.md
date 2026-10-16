# Panel administrativo de Chaquill Chak'a

Aplicación Angular independiente para recepción, contabilidad y gestión de cuentas del hostal.

## Desarrollo local

```sh
npm install
npm start
```

## Publicación en Netlify

Conecta este directorio como raíz del sitio de administración:

- Build command: `npm run build`
- Publish directory: `dist/admin/browser`

El archivo `src/_redirects` habilita las rutas de Angular al recargar páginas internas.

## Acceso inicial

Configura en el servicio backend de Render las variables `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El primer inicio de sesión correcto con `ADMIN_EMAIL` y `ADMIN_PASSWORD` crea la cuenta Administrador inicial en MongoDB; luego puede crear y administrar las cuentas del personal desde **Usuarios y roles**.

El correo de administrador debe ser `admin@chaquillchaka.com.pe`. Las cuentas de personal deben usar el mismo dominio, por ejemplo `recepcion@chaquillchaka.com.pe`, `contabilidad@chaquillchaka.com.pe` y `rrhh@chaquillchaka.com.pe`. Para esta demostración, esas direcciones son identificadores de inicio de sesión: no se comprueba que existan los buzones ni se envían correos.

No guardes credenciales ni secretos en este repositorio. Usa contraseñas únicas de al menos 12 caracteres para las nuevas cuentas.

## Roles

- **Administrador:** gestiona cuentas y reservas; acceso completo.
- **Recepción:** consulta datos de reservas y actualiza su estado.
- **Contabilidad:** consulta fechas, habitación, medio de pago y montos; no recibe datos personales ni puede editar reservas.
- **Recursos Humanos:** crea cuentas y administra roles no administrativos; no accede a reservas ni puede crear, cambiar o desactivar cuentas Administrador.

Los permisos se verifican en la API, no solo en la interfaz.
