# CONTEXTO MAESTRO PARA IA — DOCUMENTACIÓN TÉCNICA DEL PROYECTO

> **Propósito de este archivo:** Documento estructurado y fácil de leer para otra Inteligencia Artificial, con toda la información real verificada en producción del proyecto para generar el **Documento Técnico (PDF)**, la **Bitácora de Trabajo**, las **Conclusiones (generales e individuales)** y el **Guión de Presentación Final** conforme a la rúbrica oficial.

---

## 1. Metadatos Académicos y Opciones Elegidas

* **Materia:** Sistemas Operativos y Servicios en Red
* **Carrera / Semestre:** Licenciatura en Comercio Electrónico — 7° Semestre
* **Objetivo General (según rúbrica oficial):** Implementar un entorno de servicios de red que simule necesidades reales de una empresa de comercio electrónico (**Tienda Lunna de Coco / Plataforma Afótica**), mediante la instalación y configuración de sistemas operativos y servicios de infraestructura, aplicando buenas prácticas de administración y documentación técnica.
* **Opciones elegidas del temario (combinación 1 + 3 en Linux):**
  * **Opción 1:** **Servidor Web para Comercio Electrónico en Linux** (**Ubuntu `26.04.1 LTS` (`resolute`)**) — Red pública/interna aislada y usuarios administrativos, servidor web + publicación del sitio de comercio electrónico con nombre de dominio y base de datos integrada.
    * *Nota arquitectónica de equivalencia moderna:* En lugar del stack clásico Apache + PHP + MySQL, se implementó una arquitectura moderna en producción sobre **Ubuntu Linux (`26.04.1 LTS`)** usando **Caddy (`caddy:2-alpine`, contenedor `kws_caddy_proxy`)** como servidor web / Reverse Proxy HTTPS automático multi-sitio, aplicaciones web SSR en **Astro 4 + Next.js 14 (Node.js 22)** y **PostgreSQL 16** como motor de base de datos relacional.
  * **Opción 3:** **Infraestructura de Servicios de Red en Linux** (**Ubuntu `26.04.1 LTS`**) — Configuración de red cliente-servidor (mínimo 2 equipos), gestión de usuarios/permisos, **acceso remoto SSH** y **transferencia de archivos FTP/SFTP** (carpeta de intercambio + pruebas de transferencia).
* **Servidor / VPS real en producción:** **VPS Vultr** (hostname **`LABU-PAGES`**, IP pública **`64.177.51.201`**, **Ubuntu `26.04.1 LTS` — Codename `resolute`**), con **Caddy (`kws_caddy_proxy`)** como servidor web frontal compartiendo infraestructura de forma aislada con otros sitios ya en línea.
* **Equipo:** **6 integrantes** (la rúbrica evalúa participación individual demostrable y preguntas orales individuales).

### Criterios de Evaluación Oficiales (100%)
| Criterio | Ponderación |
| :--- | :---: |
| Funcionamiento de los servicios | 50% |
| Configuración correcta | 12% |
| Documento técnico (PDF) | 15% |
| Bitácora de trabajo individual y grupal | 8% |
| Conclusiones individuales (y conclusión general de al menos 350 palabras) | 8% |
| Presentación y demostración (15 a 20 minutos) | 7% |
| **Total** | **100%** |

---

## 2. División Exacta de Responsabilidades (6 Integrantes — Opciones 1 y 3)

> **Instrucción para la IA lectora:** Usa exactamente estos 6 nombres y su división técnica en todo el documento (Desarrollo, Configuraciones, Bitácora, Conclusiones individuales y Presentación).

### 1. **Angel Santiago Ruiz Garcia**
* **Bloque asignado:** **Opción 1 (Act. 1) & Opción 3 (Act. 1) — Sistema Operativo, Red, Firewall y Usuarios Administrativos en VPS Vultr (Ubuntu `26.04.1 LTS`)**.
* **Actividades realizadas:**
  * Administración y verificación del entorno **Ubuntu `26.04.1 LTS` (`resolute`)** en el **VPS Vultr (`LABU-PAGES`, IP pública `64.177.51.201`)**, estableciendo la comunicación cliente-servidor entre el VPS y los equipos locales de administración.
  * Gestión de red y firewall perimetral (puertos públicos habilitados únicamente para `22/TCP` SSH/SFTP, `80/TCP` y `443/TCP+UDP` Caddy HTTP/HTTPS/QUIC, y rango `21/TCP` + `30000-30009/TCP` cuando se habilita FTP pasivo), aislando los servicios internos en subredes privadas Docker.
  * Administración de accesos y estructura de directorios en `/root/Tienda-Lunna-de-coco/` (coexistiendo limpiamente junto a `/root/KWS-MX-docker/`, `/root/dps-mx/`, etc.) y asignación de permisos con `chown` / `chmod` sobre carpetas críticas (`uploads/`, `backups/`, scripts ejecutables).
* **Evidencias esperadas:** Salida de `lsb_release -a` (`Ubuntu 26.04.1 LTS`), `ip a`, reglas de red/firewall en Vultr/`ufw`, usuarios administrativos y estructura `/root/Tienda-Lunna-de-coco` con permisos.

### 2. **Carlos Eduardo Casillas Gallardo**
* **Bloque asignado:** **Opción 3 (Actividad 2) — Instalación, Configuración y Endurecimiento de SSH**.
* **Actividades realizadas:**
  * Verificación y operación de **OpenSSH Server** en Ubuntu `26.04.1 LTS` (`puerto 22`) sobre el VPS Vultr (`64.177.51.201`) para administración remota cifrada del servidor `LABU-PAGES`.
  * Configuración de buenas prácticas de autenticación segura (control de sesiones SSH, restricción de permisos ACL en clientes Windows cuando se utilizan llaves privadas con `icacls` y validación de huellas de host).
  * Validación de conexiones SSH remotas activas (`ssh <usuario>@64.177.51.201`) desde equipos cliente para desplegar contenedores, editar `.env` y recargar Caddy en tiempo real.
* **Evidencias esperadas:** Captura de conexión SSH exitosa a `root@LABU-PAGES` (`64.177.51.201`), estado del servicio `ssh`/`sshd`, verificación de acceso/llaves y logs de sesiones remotas.

### 3. **Ian Luis Garcia Gutierrez**
* **Bloque asignado:** **Opción 1 (Actividad 3) — Base de Datos Relacional (PostgreSQL 16), Usuarios, Permisos e Integración Web**.
* **Actividades realizadas:**
  * Despliegue y configuración del motor relacional **PostgreSQL 16** (`lunnadecoco-postgres`, imagen `postgres:16-alpine`) como base de datos dedicada del e-commerce en `LABU-PAGES`.
  * Creación de la base de datos productiva (`lunnadecoco`), usuario dedicado (`POSTGRES_USER=Lunnadecoco`) con contraseña segura en `.env`, y **aislamiento total de red** (expuesta únicamente a `127.0.0.1:5434` en loopback del host y conectada a la red privada Docker `lunnadecoco-internal`).
  * Inicialización de esquema relacional y datos base (`docker/init.sql` + `ensureSchema()`: `users`, `categories`, `products`, `product_modifiers`, `orders`, `site_settings`, `payment_settings`, `discount_codes`, `media_items`, `gallery_settings`) e integración con Drizzle ORM.
  * Validación en vivo de conectividad BD ↔ Web mediante `https://lunnadecoco.com/api/health` (`"database":"online"`) y respaldos automatizados (`docker/backup.sh`) hacia `/root/Tienda-Lunna-de-coco/backups/bases_de_datos`.
* **Evidencias esperadas:** Salida de `docker ps` (`lunnadecoco-postgres (healthy)`), consulta/verificación de tablas en PostgreSQL, respuesta `{"status":"ok","database":"online"}` de `/api/health` y archivo `.sql.gz` generado por `backup.sh`.

### 4. **Monika Johana Baeza Hernandez**
* **Bloque asignado:** **Opción 3 (Actividad 3) — Servicio FTP / SFTP, Carpeta de Intercambio y Optimización WebP**.
* **Actividades realizadas:**
  * Configuración del flujo de **transferencia de archivos FTP / SFTP** hacia la carpeta de intercambio del proyecto (`/root/Tienda-Lunna-de-coco/uploads/ftp-inbox`) con usuario dedicado (`FTP_USER=lunnacoco_ftp`).
  * Preparación del contenedor **FTP (`Dockerfile.ftp` con `vsftpd` en Alpine, perfil opcional `--profile ftp`, puerto `21` y modo pasivo `30000-30009` apuntando a la IP pública de Vultr `FTP_PASV_ADDRESS=64.177.51.201`)** y transferencia cifrada alternativa vía **SFTP (puerto `22`)** desde **FileZilla**.
  * Integración con el procesador automático **Google WebP (`cwebp` / `libwebp-tools` + `sharp`)** en el backend (`apps/admin/src/lib/webpOptimizer.ts`): toda imagen subida por FTP/SFTP o web se convierte a `.webp` optimizado y el archivo original se elimina automáticamente; respaldos multimedia en `/root/Tienda-Lunna-de-coco/backups/media`.
* **Evidencias esperadas:** Configuración FTP/SFTP (`FTP_PASV_ADDRESS=64.177.51.201`), captura de transferencia de archivos desde FileZilla hacia `uploads/ftp-inbox`, registro de conversión a `.webp` con borrado del original y respaldo `.tar.gz` en `backups/media`.

### 5. **Emiliano Rodriguez Vazquez**
* **Bloque asignado:** **Opción 1 (Actividad 2 — Sitio Web, Dominio y DNS) — Publicación del E-Commerce, Galería, View Transitions y DNS en Cloudflare**.
* **Actividades realizadas:**
  * Publicación del **sitio web de comercio electrónico ("Lunna de Coco")**:
    * **Frontend público (`lunnadecoco-storefront`, Astro 4 SSR):** catálogo interactivo, categorías Bento Grid 2D con View Transitions mejoradas (integrando el degradado dentro del snapshot compartido para evitar parpadeos al navegar), **Galería (`/galeria`)** asimétrica tipo Pinterest con Lightbox `<dialog>`, carrito persistente, envío y Checkout Pro Mercado Pago *(sin rutas redundantes de contacto).*
    * **Panel CMS (`lunnadecoco-admin`, Next.js 14):** gestión de productos multi-imagen desde galería, categorías, diseño/apariencia, cupones, órdenes, módulo de pagos `/pagos` y `/galeria` con subida masiva WebP y Grid 2D de 3, 4 o 5 columnas.
  * Configuración de la **zona DNS completa en Cloudflare** para `lunnadecoco.com`: registros `A` (`lunnadecoco.com`, `www.lunnadecoco.com`, `admin.lunnadecoco.com` → **`64.177.51.201`** en estado `Proxied`, con SSL/TLS `Full` / `Full (strict)`).
* **Evidencias esperadas:** Captura del panel DNS de Cloudflare con los 3 registros `A` apuntando a `64.177.51.201`, verificación `nslookup` y capturas en vivo de `https://lunnadecoco.com`, `/galeria` y `https://admin.lunnadecoco.com`.

### 6. **Reynaldo Daniel De Loera Guerrero**
* **Bloque asignado:** **Opción 1 (Actividad 2 — Servidor Web / Deploy) — Integración en Caddy Multi-Sitio (`kws_caddy_proxy`) y Docker Compose en Vultr**.
* **Actividades realizadas:**
  * Orquestación del despliegue productivo de **Lunna de Coco** (`docker-compose.prod.yml`) en **Vultr (`LABU-PAGES`)**, conectando `lunnadecoco-storefront` y `lunnadecoco-admin` a la red externa Docker preexistente **`kws-mx-docker_kws_network`** (configurada mediante `EXTERNAL_PROXY_NET=kws-mx-docker_kws_network` en `.env`) sin interrumpir los otros 4 sitios ya activos en el VPS.
  * Integración al **servidor web Caddy frontal compartido (`kws_caddy_proxy`, `caddy:2-alpine`)** editando `/root/KWS-MX-docker/Caddyfile` con recarga en caliente sin downtime (`caddy validate` + `caddy reload`):
    * Redirección permanente `301` de `www.lunnadecoco.com` → `https://lunnadecoco.com`.
    * Compresión `zstd` / `gzip`, certificados SSL/TLS automáticos y HTTP/3.
    * Reverse proxy hacia `lunnadecoco-storefront:4321` y `lunnadecoco-admin:3001` con cabeceras proxy (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`), sirviendo `/uploads/*` directamente y de forma segura desde los endpoints de Astro y Next.js (bloqueando archivos ocultos/JSON con HTTP `403`).
  * Verificación de contenedores saludables (`(healthy)`) en `docker ps` y prueba en vivo de `https://lunnadecoco.com/api/health`.
* **Evidencias esperadas:** Captura de `/root/KWS-MX-docker/Caddyfile`, salida de `caddy validate` / `caddy reload`, salida de `docker ps` mostrando los contenedores de Lunna de Coco `(healthy)` junto a los demás servicios del VPS Vultr y `curl -sS https://lunnadecoco.com/api/health`.

---

## 3. Arquitectura Técnica Real Verificada del Proyecto

### 3.1 Infraestructura Real en VPS Vultr (`LABU-PAGES`)
* **Proveedor / Host:** **VPS Vultr**, hostname **`LABU-PAGES`**, Sistema Operativo **Ubuntu `26.04.1 LTS` (`Codename: resolute`)**, IP Pública **`64.177.51.201`**.
* **Puertos relevantes en infraestructura:**
  * `22/TCP`: SSH y SFTP.
  * `80/TCP` y `443/TCP+UDP`: Servidor Web **Caddy (`kws_caddy_proxy`)** (HTTP → HTTPS automático, TLS y HTTP/3 QUIC).
  * `21/TCP` y `30000-30009/TCP` *(opcional con perfil `--profile ftp`)*: Servidor `vsftpd`.
  * `5434/TCP`: PostgreSQL ligado exclusivamente a `127.0.0.1` en el host (cerrado a Internet).
* **Contenedores activos verificados en `LABU-PAGES` (`docker ps`):**
  * **Stack Lunna de Coco:**
    * `lunnadecoco-storefront` (`tienda-lunna-de-coco-storefront`) — `Up (healthy)` — redes `kws-mx-docker_kws_network`, `lunnadecoco-internal`.
    * `lunnadecoco-admin` (`tienda-lunna-de-coco-admin`) — `Up (healthy)` — redes `kws-mx-docker_kws_network`, `lunnadecoco-internal`.
    * `lunnadecoco-postgres` (`postgres:16-alpine`) — `Up (healthy)` — red aislada `lunnadecoco-internal`.
  * **Proxy frontal compartido y otros servicios en el mismo VPS Vultr (arquitectura multi-sitio real):**
    * `kws_caddy_proxy` (`caddy:2-alpine`) en red `kws-mx-docker_kws_network`, atendiendo simultáneamente `lunnadecoco.com`, `www.lunnadecoco.com`, `admin.lunnadecoco.com` junto a `mx.kwslatam.com` (`kws_astro_app`), `br.kwslatam.com` (`kws_br_web`), `katundps.com`/`mx.katundps.com` (`dps_mx_web` + `dps_mx_db`), `br.katundps.com` (`dps_br_web` + `dps_br_db`) y automatización `n8n`.
* **Árbol real de directorios en Vultr (`/root/`):**
  ```text
  /root/
  ├── KWS-MX-docker/
  │   └── Caddyfile                      # Reverse Proxy central de kws_caddy_proxy (incluye bloques de lunnadecoco.com)
  ├── Tienda-Lunna-de-coco/              # Repositorio Tienda-Lunna-de-coco.git
  │   ├── .env                           # Variables productivas (EXTERNAL_PROXY_NET=kws-mx-docker_kws_network, APP_SLUG=lunnadecoco)
  │   ├── docker-compose.prod.yml        # Orquestación storefront, admin, postgres (+ perfil opcional ftp)
  │   ├── docker/
  │   │   ├── init.sql                   # Esquema inicial PostgreSQL
  │   │   └── backup.sh                  # Respaldo automatizado DB + uploads
  │   ├── uploads/
  │   │   ├── .cms-data/                 # Respaldo JSON sincronizado
  │   │   └── ftp-inbox/                 # Bandeja FTP/SFTP -> conversión automática a WebP
  │   └── backups/
  │       ├── bases_de_datos/            # Dumps diarios .sql.gz
  │       └── media/                     # Respaldos .tar.gz de uploads/
  ├── KWS-BR-docker-/                    # Otros proyectos alojados en el mismo VPS
  ├── dps-mx/
  ├── DPS-BR-docker/
  └── n8n-docker/
  ```

### 3.2 Stack de Software Real
* **Servidor Web / Reverse Proxy:** Caddy 2 (`caddy:2-alpine`, contenedor `kws_caddy_proxy`).
* **Tienda Pública (Storefront):** Astro 4 (`node:22-alpine`, SSR puerto interno `4321`), Tailwind CSS, Nanostores, View Transitions con degradado compartido sin parpadeo, Galería Pinterest con Lightbox `<dialog>`, Checkout Pro Mercado Pago.
* **Panel CMS Admin:** Next.js 14 (`node:22-alpine` + `libwebp-tools` `cwebp` + `sharp`), autenticación HMAC-SHA256, subida múltiple WebP con borrado de originales, Grid Editor 2D (categorías y galería 3/4/5 cols) y pasarela `/pagos`.
* **Base de Datos:** PostgreSQL 16 (`postgres:16-alpine`) con Drizzle ORM.
* **FTP / Transferencia de archivos:** SFTP sobre OpenSSH (puerto `22`) y contenedor opcional `vsftpd` (`Dockerfile.ftp`, Alpine, `FTP_PASV_ADDRESS=64.177.51.201`) hacia `uploads/ftp-inbox`.
* **Dominios activos en producción:** `https://lunnadecoco.com` (tienda), `https://www.lunnadecoco.com` (redirige `301` a raíz), `https://admin.lunnadecoco.com` (CMS).
* **Verificación en vivo de salud:** `https://lunnadecoco.com/api/health` → `{"status":"ok","service":"esqueleto-storefront","database":"online"}`.

---

## 4. Bitácora de Trabajo Base (Formato Oficial Exigido por el PDF)

> La rúbrica exige la tabla: **Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados**, demostrando participación clara de los **6 integrantes**.

| Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados y solución |
| :--- | :--- | :--- | :--- |
| `[Semana 1 - Fecha]` | Preparación del **VPS Vultr (`LABU-PAGES`, IP `64.177.51.201`)** con **Ubuntu `26.04.1 LTS`**, revisión de puertos/firewall, creación de directorio `/root/Tienda-Lunna-de-coco` y organización de permisos para cargas y respaldos. | **Angel Santiago Ruiz Garcia** | **Problema:** El VPS Vultr ya alojaba otros proyectos en producción bajo `/root/` y una ruta clásica `/var/www/` no existía en esta máquina. **Solución:** Se adaptó el despliegue limpio dentro de `/root/Tienda-Lunna-de-coco` respetando los puertos activos y permisos de carpetas `uploads/` y `backups/` sin afectar otros servicios. |
| `[Semana 1 - Fecha]` | Verificación de **OpenSSH Server** en Ubuntu `26.04.1 LTS` (puerto `22`), acceso remoto desde equipos cliente hacia `64.177.51.201` y endurecimiento de permisos de llaves/credenciales. | **Carlos Eduardo Casillas Gallardo** | **Problema:** Al probar conexiones SSH desde Windows con llave privada, el cliente rechazaba el acceso por permisos heredados demasiado abiertos (`UNPROTECTED PRIVATE KEY FILE!`). **Solución:** Se aplicó `icacls` con `/inheritance:r` y `/grant:r` para restringir lectura al propietario y se validó la sesión remota estable hacia `LABU-PAGES`. |
| `[Semana 2 - Fecha]` | Despliegue de **PostgreSQL 16 (`lunnadecoco-postgres`)** en red interna `lunnadecoco-internal`, creación de BD `lunnadecoco`, usuario dedicado, `init.sql`, verificación `/api/health` y script `docker/backup.sh`. | **Ian Luis Garcia Gutierrez** | **Problema:** El `.env` inicial conservaba `DATABASE_URL` con credenciales de ejemplo (`admin:CAMBIA_...`) y espacios sobrantes al final de líneas de contraseña que podían alterar la lectura en Docker/Bash. **Solución:** Se limpiaron espacios, se unificó `POSTGRES_USER`, contraseña y puerto `5434`, logrando estado `(healthy)` y `"database":"online"` en `/api/health`. |
| `[Semana 2 - Fecha]` | Configuración de carpeta de intercambio `uploads/ftp-inbox`, soporte SFTP/FTP (`Dockerfile.ftp` con `vsftpd` y `FTP_PASV_ADDRESS=64.177.51.201`) y optimización automática Google WebP (`cwebp` + `sharp`). | **Monika Johana Baeza Hernandez** | **Problema:** Al borrar el archivo original justo después de convertirlo en Windows surgía bloqueo `EBUSY` en `sharp`, y tras migrar a Vultr `FTP_PASV_ADDRESS` seguía apuntando a la IP anterior. **Solución:** Se desactivó la caché de descriptores (`sharp.cache(false)`), se procesó mediante `Buffer` y se actualizó `FTP_PASV_ADDRESS=64.177.51.201`. |
| `[Semana 3 - Fecha]` | Configuración de registros DNS `A` en Cloudflare (`@`, `www`, `admin` → `64.177.51.201`), publicación de Storefront Astro y CMS Next.js, Galería Pinterest y optimización visual de View Transitions. | **Emiliano Rodriguez Vazquez** | **Problema:** Al navegar por categorías con View Transitions desaparecía el degradado oscuro y volvía a aparecer; además existía la página redundante `/contacto`. **Solución:** Se integró imagen + degradado dentro del contenedor compartido `transition:name="cat-img-*"`, se eliminó `/contacto` y se compiló limpio (`astro check`: 0 errores). |
| `[Semana 3 - Fecha]` | Integración de **Lunna de Coco (`docker-compose.prod.yml`)** a la red externa **`kws-mx-docker_kws_network`** y configuración del **Caddy existente (`kws_caddy_proxy`)** en `/root/KWS-MX-docker/Caddyfile` con recarga en caliente. | **Reynaldo Daniel De Loera Guerrero** | **Problema:** El `.env` base apuntaba a `afotica_caddy_net` (red inexistente en Vultr) y había riesgo de afectar las 4 webs ya activas o fallar `/uploads/*` porque `kws_caddy_proxy` no montaba esa carpeta en `/var/www`. **Solución:** Se configuró `EXTERNAL_PROXY_NET=kws-mx-docker_kws_network`, se agregaron los 3 bloques de `lunnadecoco.com` delegando `/uploads/*` a Astro/Next.js y se ejecutó `caddy validate` + `caddy reload` sin downtime. |

---

## 5. Checklist de Evidencias (Capturas para el Documento Técnico PDF)

### Evidencias Opción 3 (Infraestructura Linux, SSH, FTP en VPS Vultr)
1. `[CAPTURA_1]` Consola del **VPS Vultr (`LABU-PAGES`, Ubuntu `26.04.1 LTS`)** mostrando `lsb_release -a`, configuración de red (`ip a`) y directorio `/root/Tienda-Lunna-de-coco`.
2. `[CAPTURA_2]` Reglas de red / firewall en Vultr / `ufw` (puertos `22`, `80`, `443`, y `21`/`30000-30009` cuando aplica FTP).
3. `[CAPTURA_3]` Conexión remota **SSH** exitosa hacia `root@LABU-PAGES` (`64.177.51.201`) y verificación del servicio `ssh`.
4. `[CAPTURA_4]` Cliente **FileZilla** (SFTP o FTP pasivo hacia `64.177.51.201`) transfiriendo imágenes hacia `/root/Tienda-Lunna-de-coco/uploads/ftp-inbox`, junto con evidencia de conversión automática a `.webp` y eliminación del archivo original.
5. `[CAPTURA_5]` Ejecución de respaldo `docker/backup.sh` generando archivos en `backups/bases_de_datos` (`.sql.gz`) y `backups/media` (`.tar.gz`).

### Evidencias Opción 1 (Servidor Web Caddy `kws_caddy_proxy`, Dominio y PostgreSQL 16)
6. `[CAPTURA_6]` Configuración del servidor web **Caddy** (`/root/KWS-MX-docker/Caddyfile` con los bloques `www.lunnadecoco.com`, `lunnadecoco.com` y `admin.lunnadecoco.com`) y resultado **`Valid configuration`** tras `caddy validate` / `caddy reload`.
7. `[CAPTURA_7]` Salida de `docker ps` mostrando **`lunnadecoco-storefront`**, **`lunnadecoco-admin`** y **`lunnadecoco-postgres`** en estado **`(healthy)`** conectados a `kws-mx-docker_kws_network`, coexistiendo con `kws_caddy_proxy` y los demás proyectos del VPS.
8. `[CAPTURA_8]` Panel DNS de **Cloudflare** mostrando registros `A` (`lunnadecoco.com`, `www.lunnadecoco.com`, `admin.lunnadecoco.com` → `64.177.51.201` en `Proxied`).
9. `[CAPTURA_9]` Base de datos **PostgreSQL 16** operativa y prueba en vivo `curl -sS https://lunnadecoco.com/api/health` devolviendo `{"status":"ok","service":"esqueleto-storefront","database":"online"}`.
10. `[CAPTURA_10]` Sitio web público **`https://lunnadecoco.com`**, página **`/galeria`** (grid Pinterest + Lightbox) y panel CMS **`https://admin.lunnadecoco.com/galeria`** operando con certificado SSL válido.

---

## 6. Guión de Presentación Final (15–20 minutos entre 6 Integrantes)

1. **Minutos 0:00–3:00 — Angel Santiago Ruiz Garcia:** Introducción del proyecto e-commerce (**Lunna de Coco / Plataforma Afótica**), arquitectura **Opción 1 + Opción 3** sobre el **VPS Vultr (`LABU-PAGES`, Ubuntu `26.04.1 LTS`, `64.177.51.201`)**, red, firewall y estructura `/root/Tienda-Lunna-de-coco`.
2. **Minutos 3:00–6:00 — Carlos Eduardo Casillas Gallardo:** Demostración de administración remota segura vía **SSH** hacia `64.177.51.201`, verificación de servicio `sshd` y buenas prácticas de acceso/ACL.
3. **Minutos 6:00–9:00 — Ian Luis Garcia Gutierrez:** Demostración de **PostgreSQL 16 (`lunnadecoco-postgres`)**, aislamiento en `lunnadecoco-internal`, prueba `/api/health` (`"database":"online"`) y respaldo con `docker/backup.sh`.
4. **Minutos 9:00–12:00 — Monika Johana Baeza Hernandez:** Demostración de transferencia en **FileZilla** hacia `uploads/ftp-inbox`, conversión automática con **Google WebP (`cwebp`)** y borrado del archivo original.
5. **Minutos 12:00–15:30 — Emiliano Rodriguez Vazquez:** Registros DNS en Cloudflare (`lunnadecoco.com`, `admin.lunnadecoco.com` → `64.177.51.201`), recorrido por la tienda en vivo, View Transitions en categorías, **Galería (`/galeria`)** y gestión multi-foto en el CMS.
6. **Minutos 15:30–18:30 — Reynaldo Daniel De Loera Guerrero:** Arquitectura multi-sitio con **Caddy (`kws_caddy_proxy`)** en Vultr (`/root/KWS-MX-docker/Caddyfile`, red compartida `kws-mx-docker_kws_network`, `caddy validate`/`reload` sin tirar los otros sitios activos).
7. **Minutos 18:30–20:00 — Todo el equipo:** Conclusiones finales y ronda de preguntas individuales.

---

## 7. Prompt / Instrucciones Directas para la Otra Inteligencia Artificial

Copia y pega este archivo junto con este prompt en tu otra IA para generar el documento final:

```text
Lee completo este archivo Markdown. El proyecto corresponde a la materia "Sistemas Operativos y Servicios en Red" (7° Semestre, Licenciatura en Comercio Electrónico) y combina exclusivamente la Opción 1 (Servidor Web para Comercio Electrónico en Linux) y la Opción 3 (Infraestructura de Servicios de Red en Linux) desplegadas en producción sobre un VPS en Vultr (hostname LABU-PAGES, IP pública 64.177.51.201, Ubuntu 26.04.1 LTS resolute), utilizando Caddy (kws_caddy_proxy) como servidor web / reverse proxy HTTPS multi-sitio. No incluyas nada de Windows Server, Active Directory ni referencias antiguas de Azure.

Redacta el Documento Técnico completo listo para exportar a PDF con:
1. Portada (con los 6 integrantes reales), Índice, Introducción, Objetivos (General y Específicos), Desarrollo del Proyecto (justificando técnicamente el uso equivalente moderno de Caddy multi-sitio + Astro/Next.js + PostgreSQL 16 en Docker sobre Ubuntu 26.04.1 LTS), Configuraciones Realizadas (usando los datos reales del VPS Vultr LABU-PAGES, /root/KWS-MX-docker/Caddyfile, SSH, FTP/SFTP, Docker red kws-mx-docker_kws_network y PostgreSQL 16 descritos en la Sección 3), Sección de Evidencias (marcando exactamente dónde pegar cada [CAPTURA_1] a [CAPTURA_10]), Resultados Obtenidos, Conclusión General (mínimo 350 palabras) + 6 Conclusiones Individuales (una por cada integrante según su rol), y Bibliografía en formato APA.
2. Bitácora de Trabajo completa en tabla con las columnas: Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados.
3. Un bloque extra al final con 2 posibles preguntas de evaluación oral individual y su respuesta modelo para cada uno de los 6 integrantes según lo que configuró.
```
