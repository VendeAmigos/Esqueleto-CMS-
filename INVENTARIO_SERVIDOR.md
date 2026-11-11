# 📋 Inventario, Despliegue y Manual Multi-Cliente (Boilerplate)

Este documento describe la arquitectura de producción de **Esqueleto CMS**, cómo desplegar múltiples tiendas o puntos de venta (POS) a partir de este boilerplate en un servidor VPS, y cómo guiar a cada cliente para activar sus cobros en **Mercado Pago**.

---

## 🌐 1. Arquitectura de Contenedores (Docker + Caddy)

| Servicio | Contenedor (`APP_SLUG=esqueleto`) | Imagen Base | Puerto Interno | Función |
| :--- | :--- | :--- | :---: | :--- |
| **Reverse Proxy** | `esqueleto-caddy` | `caddy:2-alpine` | `80`, `443` | SSL automático (Let's Encrypt), HTTP/3, compresión Zstd/Gzip y caché de `/uploads/*`. |
| **Tienda Pública** | `esqueleto-storefront` | `node:22-alpine` (Astro) | `4321` | Catálogo público, Bento Grid 2D, carrito reactivo, cálculo de envíos y Checkout Pro. |
| **Panel CMS Admin** | `esqueleto-admin` | `node:22-alpine` (Next.js) | `3001` | Gestión de productos, modificadores, Grid 2D interactivo, cupones, órdenes y pasarela de pago. |
| **Base de Datos** | `esqueleto-postgres` | `postgres:16-alpine` | `5432` | Persistencia relacional aislada en red interna (`127.0.0.1:5434` en host). |

---

## 🚀 2. Cómo Desplegar un Nuevo Cliente / Punto de Venta (Boilerplate)

Este repositorio está parametrizado mediante `APP_SLUG` y puertos dinámicos en `.env` para que puedas lanzar **múltiples tiendas independientes en un mismo VPS** o en servidores dedicados sin conflictos de nombres ni puertos:

### Paso A: Clonar y configurar `.env`
```bash
git clone <URL_DEL_REPOSITORIO> /var/www/tienda-cliente-1
cd /var/www/tienda-cliente-1
cp .env.example .env
```

Edita `.env` con los datos únicos del cliente:
```env
APP_SLUG=cliente1
STOREFRONT_PORT=4321
ADMIN_PORT=3001
POSTGRES_HOST_PORT=5434

POSTGRES_USER=admin
POSTGRES_PASSWORD=ContrasenaSeguraCliente1_2026
POSTGRES_DB=cliente1_db

PUBLIC_STOREFRONT_URL=https://tienda-cliente1.com
PUBLIC_ADMIN_URL=https://admin.tienda-cliente1.com
STOREFRONT_DOMAIN=tienda-cliente1.com
ADMIN_DOMAIN=admin.tienda-cliente1.com

ADMIN_USER=admin
ADMIN_PASSWORD=PasswordAdminCliente1
ADMIN_SECRET=llave-secreta-unica-64-caracteres-cliente1
```

### Paso B: Levantar en Producción
- **Si el servidor usa el Caddy incluido en este proyecto**:
  ```bash
  docker compose up -d --build
  ```
- **Si el servidor ya tiene una red Caddy compartida (`docker-compose.prod.yml`)**:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```

---

## 💳 3. Guía Paso a Paso de Mercado Pago para tus Clientes

Con el nuevo módulo **`Pasarela de Pagos` (`/pagos`)** integrado en el panel de administración, **tus clientes ya no necesitan darte acceso SSH ni editar archivos `.env`**. Ellos mismos (o tú desde su panel Admin) pueden activar sus cobros en 4 pasos:

### Paso 1: Crear la Aplicación en Mercado Pago Developers
1. El cliente inicia sesión con su cuenta de Mercado Pago (donde recibirá el dinero de sus ventas) en:
   👉 **[https://www.mercadopago.com.mx/developers/panel/app](https://www.mercadopago.com.mx/developers/panel/app)**
2. Hace clic en el botón azul **"Crear aplicación"**.
3. Asigna el nombre de su tienda (ej. *Tienda Lunna de Coco*).
4. En **¿Qué tipo de solución de pago vas a integrar?**, selecciona **"Pagos online"**.
5. En **¿Estás usando una plataforma de e-commerce?**, selecciona **"No"**.
6. En **¿Qué producto estás integrando?**, selecciona **"Checkout Pro"** y confirma la creación.

### Paso 2: Activar y Copiar las Credenciales de Producción
1. Dentro de su aplicación recién creada, en el menú lateral izquierdo, hace clic en **"Credenciales de producción"**.
2. Selecciona la **Industria / Giro de su negocio**, declara su sitio web (`https://su-dominio.com`) y acepta los términos.
3. Copia dos datos que aparecen en pantalla:
   - **Public Key** (comienza con `APP_USR-...`)
   - **Access Token** (comienza con `APP_USR-...`)
   *(Nota: Si primero desea simular compras sin dinero real, puede copiar las de la sección **"Credenciales de prueba"** que comienzan con `TEST-...`).*

### Paso 3: Configurar el Webhook (Confirmación Automática de Pagos)
Para que cuando un comprador pague con tarjeta, SPEI u OXXO la orden cambie automáticamente a **"Pagado"** en la sección de Órdenes:
1. En el menú lateral izquierdo de Mercado Pago Developers, entra a **"Webhooks" -> "Configurar notificaciones"**.
2. En la pestaña **Modo producción**, pega la URL de Webhook que aparece lista para copiar en su panel Admin (`/pagos`):
   ```text
   https://su-dominio.com/api/webhook
   ```
3. En **"Eventos recomendados"**, marca la casilla **"Pagos" (`payment`)**.
4. Hace clic en **"Guardar configuración"**.
5. Mercado Pago mostrará en pantalla una **Clave secreta (`Secret signature`)**: la copia.

### Paso 4: Pegar y Probar en el CMS (`/pagos`)
1. El cliente entra a su panel de administración (`https://admin.su-dominio.com/pagos`).
2. Activa el interruptor **"Cobros con Mercado Pago Habilitados"**.
3. Pega su **Public Key**, **Access Token** y **Clave Secreta del Webhook**.
4. Presiona el botón **"Probar Conexión con Mercado Pago"**: el CMS se conectará en tiempo real con la API de Mercado Pago y mostrará el nombre, correo e ID de la cuenta vinculada.
5. Presiona **"Guardar Configuración"**. ¡La tienda queda cobrando en vivo al instante!

---

## 🛡️ 4. Respaldos y Mantenimiento en el Servidor

### Ejecutar Backup Manual o por Cron (`docker/backup.sh`)
```bash
chmod +x docker/backup.sh
./docker/backup.sh
```
Para programarlo todos los días a las 3:00 AM en el servidor (`crontab -e`):
```cron
0 3 * * * cd /var/www/app && ./docker/backup.sh >> /var/log/esqueleto-backup.log 2>&1
```

### Verificar Salud de los Servicios (`Healthchecks`)
- **Storefront**: `curl http://127.0.0.1:4321/api/health`
- **Admin CMS**: `curl http://127.0.0.1:3001/api/health`
- **Estado en Docker**: `docker compose ps`
