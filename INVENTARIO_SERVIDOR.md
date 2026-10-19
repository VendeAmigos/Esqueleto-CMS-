# 📋 Inventario y Bitácora del Servidor | shop.afotica.com

Este documento mantiene el registro centralizado de la infraestructura, contenedores, servicios instalados, integraciones y rutas de almacenamiento de tu tienda.

---

## 🌐 1. Dominios y Red
| Recurso | Destino / IP | Función | Estado |
| :--- | :--- | :--- | :---: |
| `shop.afotica.com` | IP Pública VPS | Tienda / Catálogo para clientes (Astro) | 🟡 Por apuntar DNS |
| `admin.shop.afotica.com` | IP Pública VPS | Panel de control y catálogo (Next.js) | 🟡 Por apuntar DNS |
| `Puerto 80 (HTTP)` | Nginx Container | Tráfico web estándar y validación Let's Encrypt | 🟢 Activo |
| `Puerto 443 (HTTPS)`| Nginx Container | Tráfico cifrado SSL/TLS | 🟡 Requiere Certbot en VPS |
| `Puerto 5432 (DB)` | Red interna Docker | PostgreSQL (bloqueado al exterior por seguridad) | 🟢 Activo |

---

## 🐳 2. Contenedores Docker Activos (`docker-compose.yml`)

| Contenedor | Imagen Base | Puerto Interno | Función |
| :--- | :--- | :--- | :--- |
| **`esqueleto-nginx`** | `nginx:alpine` | `80`, `443` | Reverse proxy perimetral, compresión Gzip, caché estática `/uploads/` y terminación SSL. |
| **`esqueleto-storefront`** | `node:22-alpine` (Astro Standalone) | `4321` | Tienda de alta velocidad con carrito reactivo y personalizador de modificadores. |
| **`esqueleto-admin`** | `node:22-alpine` (Next.js Standalone) | `3001` | Panel de administración protegido, subida Drag & Drop y compresión WebP. |
| **`esqueleto-postgres`** | `postgres:16-alpine` | `5432` | Base de datos relacional local con autenticación interna. |
| **`esqueleto-certbot`** | `certbot/certbot` | N/A | Renovador automático de certificados SSL de Let's Encrypt cada 12 horas. |

---

## 🗄️ 3. Base de Datos (PostgreSQL 16)

- **Nombre de la BD:** `esqueleto`
- **Usuario:** `admin`
- **Driver / ORM:** Drizzle ORM + `postgres.js`
- **Volumen Persistente:** `postgres_data` (alojado en el motor de Docker)
- **Script de auto-inicialización:** `docker/init.sql` (montado en `/docker-entrypoint-initdb.d/`)

### Tablas Creadas:
1. `categories`: Categorías del catálogo (Ropa, Tecnología, Gourmet, Accesorios).
2. `products`: Catálogo con `title`, `description`, `image_url`, `base_price` (en centavos), `is_active`.
3. `product_modifiers`: Grupos de opciones (`Talla`, `Color`, `Molienda`, etc.) con tipo `single` o `multiple`.
4. `modifier_options`: Opciones específicas con ajuste de precio en centavos (`price_delta`).
5. `product_variants`: Variantes y control de SKU/stock.
6. `orders`: Órdenes de compra con `total`, `status`, `customer_email`, `items_summary` e `items_json`.
7. `users`: Cuentas de usuario y administradores.

---

## 💳 4. Integración Mercado Pago

| Parámetro | Configuración |
| :--- | :--- |
| **Tipo de Solución** | **Checkout Pro** (API de Preferences) |
| **Tipo de Credencial** | Producción (`APP_USR-...`) |
| **Access Token** | Configurado en `.env` |
| **Webhook URL** | `https://shop.afotica.com/api/webhook` |
| **Eventos Suscritos** | `Pagos (payment)` |
| **Rutas de Retorno (Back URLs)** | • Éxito: `/orden-confirmada?status=approved`<br>• Pendiente: `/orden-confirmada?status=pending`<br>• Falla: `/carrito?status=failure` |

---

## 💾 5. Rutas de Archivos y Persistencia en el VPS

- **Directorio de la Aplicación en VPS:** `/var/www/app/`
- **Imágenes de Productos (`uploads/`):**
  - Servidas por Nginx en: `https://shop.afotica.com/uploads/`
  - Caché: `Cache-Control: public, max-age=2592000` (30 días)
  - Ruta física en host: `/var/www/app/uploads/`
- **Certificados SSL:**
  - Almacén en host: `/var/www/app/certbot/conf/`
  - Desafío ACME: `/var/www/app/certbot/www/`

---

## 🛡️ 6. Paquetes y Configuración Recomendada del VPS (Ubuntu LTS)

| Componente | Comando de Instalación / Verificación | Estado |
| :--- | :--- | :---: |
| **Docker Engine** | `curl -fsSL https://get.docker.com \| sh` | [ ] |
| **Docker Compose Plugin** | Incluido con Docker (`docker compose version`) | [ ] |
| **Memoria SWAP (2 GB)** | `fallocate -l 2G /swapfile && swapon /swapfile` | [ ] |
| **Firewall (UFW)** | `ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable` | [ ] |
| **Fail2ban (Anti-bruteforce SSH)** | `apt install fail2ban -y && systemctl enable fail2ban` | [ ] |
| **Herramientas de diagnóstico** | `apt install git curl htop nano -y` | [ ] |

---

## ✅ 7. Checklist de Puesta en Producción

- [x] Eliminar Turso y migrar a PostgreSQL local en Docker.
- [x] Configurar esquema con modificadores y precios dinámicos.
- [x] Crear seed con imágenes en alta resolución y modificadores completos.
- [x] Implementar Drag & Drop con compresión automática a WebP en el panel Admin.
- [x] Configurar cálculo de precios en vivo en Storefront y validación en servidor.
- [x] Obtener y registrar `MP_ACCESS_TOKEN` de Mercado Pago en `.env`.
- [x] Probar compilación local con Docker (`docker compose up -d --build`).
- [ ] Configurar registros DNS `A` para `shop.afotica.com` y `admin.shop.afotica.com`.
- [ ] Clonar repositorio en `/var/www/app` en el VPS.
- [ ] Ejecutar Certbot para emitir certificados SSL oficiales de Let's Encrypt.
- [ ] Configurar la URL de Webhook en el panel de desarrollador de Mercado Pago.
- [ ] Realizar una compra de prueba de punta a punta.

---

## 🔧 8. Comandos de Diagnóstico Rápido en el Servidor

```bash
# Ver estado y salud de todos los contenedores
docker compose ps

# Ver logs en vivo de todos los servicios
docker compose logs -f

# Ver logs específicos de un servicio (ej. Mercado Pago o BD)
docker compose logs -f storefront
docker compose logs -f postgres

# Respaldar la base de datos (Backup rápido a archivo .sql)
docker compose exec postgres pg_dump -U admin esqueleto > backup_$(date +%Y%m%d).sql

# Restaurar la base de datos desde un archivo .sql
cat backup.sql | docker compose exec -T postgres psql -U admin -d esqueleto

# Reiniciar todos los servicios
docker compose restart
```
