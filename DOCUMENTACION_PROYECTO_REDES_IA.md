# CONTEXTO MAESTRO PARA IA — DOCUMENTACIÓN TÉCNICA DEL PROYECTO

> **Propósito de este archivo:** Documento estructurado y fácil de leer para otra Inteligencia Artificial, con toda la información real del proyecto para generar el **Documento Técnico (PDF)**, la **Bitácora de Trabajo**, las **Conclusiones (generales e individuales)** y el **Guión de Presentación Final** conforme a la rúbrica oficial.

---

## 1. Metadatos Académicos y Opciones Elegidas

* **Materia:** Sistemas Operativos y Servicios en Red
* **Carrera / Semestre:** Licenciatura en Comercio Electrónico — 7° Semestre
* **Objetivo General (según rúbrica oficial):** Implementar un entorno de servicios de red que simule necesidades reales de una empresa de comercio electrónico (**Tienda Lunna de Coco / Plataforma Afótica**), mediante la instalación y configuración de sistemas operativos y servicios de infraestructura, aplicando buenas prácticas de administración y documentación técnica.
* **Opciones elegidas del temario (combinación 1 + 3 en Linux):**
  * **Opción 1:** **Servidor Web para Comercio Electrónico en Linux** (**Ubuntu Server 24.04 LTS**) — Red estática/usuarios administrativos, servidor web + publicación del sitio de comercio electrónico con nombre de dominio y base de datos integrada.
    * *Nota arquitectónica de equivalencia moderna:* En lugar del stack clásico Apache + PHP + MySQL, se implementó una arquitectura moderna en producción sobre **Ubuntu Server 24** usando **Caddy (`caddy:2-alpine`)** como servidor web / Reverse Proxy HTTPS automático, aplicaciones web SSR en **Astro 4 + Next.js 14 (Node.js 22)** y **PostgreSQL 16** como motor de base de datos relacional.
  * **Opción 3:** **Infraestructura de Servicios de Red en Linux** (**Ubuntu Server 24.04 LTS**) — Configuración de red (mínimo 2 equipos), gestión de usuarios, **acceso remoto SSH** y **servicio FTP** (carpeta de intercambio + pruebas de transferencia).
* **Sistema Operativo principal del servidor y deploy:** **Ubuntu Server 24.04 LTS** (VM `afotica` en Azure, grupo `afotica_group`, IP pública `4.154.18.17`), con **Caddy** como servidor web frontal.
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
* **Bloque asignado:** **Opción 1 (Act. 1) & Opción 3 (Act. 1) — Instalación, Red y Usuarios Administrativos en Ubuntu Server 24**.
* **Actividades realizadas:**
  * Instalación y aprovisionamiento de **Ubuntu Server 24.04 LTS** (servidor `afotica` en la nube Azure, grupo `afotica_group`, IP `4.154.18.17`) y enlace cliente-servidor entre al menos 2 equipos (servidor Ubuntu 24 + equipo local de administración).
  * Configuración de red estática/pública y reglas de seguridad perimetrales (Azure Networking / `ufw`) habilitando únicamente puertos necesarios (`22`, `80`, `443` y rango FTP cuando aplica).
  * Creación y gestión de **usuarios administrativos** (`Afotica`, privilegios `sudo`, grupo `docker`) y organización de permisos de carpetas mediante `chown` / `chmod` para la estructura oficial `/var/www/afotica/` (`/clientes/lunnadecoco`, `/clientes/cliente_futuro`, `/caddy`, `/backups`).
* **Evidencias esperadas:** Salida de `lsb_release -a` (Ubuntu 24.04), `ip a`, reglas de red/firewall, `id` / usuarios creados y árbol `/var/www/afotica` con permisos.

### 2. **Carlos Eduardo Casillas Gallardo**
* **Bloque asignado:** **Opción 3 (Actividad 2) — Instalación, Configuración y Endurecimiento de SSH**.
* **Actividades realizadas:**
  * Verificación y configuración de **OpenSSH Server** en Ubuntu Server 24 (`puerto 22`) para acceso remoto seguro de administración.
  * Configuración de **autenticación segura mediante par de llaves criptográficas** (`afotica_key.pem`), deshabilitando accesos inseguros y corrigiendo restricciones ACL en clientes Windows (`icacls .\afotica_key.pem /inheritance:r`).
  * Restricción de accesos remotos por usuario/llave y validación de sesiones SSH funcionales desde consola externa (`ssh -i "afotica_key.pem" ...`).
* **Evidencias esperadas:** Captura de conexión SSH exitosa a Ubuntu Server 24, estado del servicio `ssh`/`sshd`, permisos de llave y pruebas de restricción de acceso.

### 3. **Ian Luis Garcia Gutierrez**
* **Bloque asignado:** **Opción 1 (Actividad 3) — Base de Datos Relacional (PostgreSQL 16), Usuarios, Permisos e Integración Web**.
* **Actividades realizadas:**
  * Despliegue y configuración del motor relacional **PostgreSQL 16** (`lunnadecoco-postgres`, imagen `postgres:16-alpine`) como base de datos operativa del e-commerce.
  * Creación de la base de datos productiva (`lunnadecoco`), definición de usuario y contraseña segura (`POSTGRES_USER`, `POSTGRES_PASSWORD`) en `.env`, y **aislamiento de red** (enlazado exclusivamente a `127.0.0.1:5434` en host y red privada Docker `lunnadecoco-internal`).
  * Creación de tablas y datos iniciales (`docker/init.sql` + `ensureSchema()`: `users`, `categories`, `products`, `product_modifiers`, `orders`, `site_settings`, `payment_settings`, `discount_codes`, `media_items`, `gallery_settings`) e integración con el storefront y panel CMS vía Drizzle ORM.
  * Validación de respaldos automatizados (`docker/backup.sh`) hacia `/var/www/afotica/backups/bases_de_datos`.
* **Evidencias esperadas:** Salida de `pg_isready`, consulta SQL de tablas operativas en PostgreSQL, esquema `docker/init.sql`, prueba de respaldo `.sql.gz` y persistencia real de productos/órdenes desde el sitio web.

### 4. **Monika Johana Baeza Hernandez**
* **Bloque asignado:** **Opción 3 (Actividad 3) — Instalación y Configuración de FTP, Carpetas de Intercambio y Optimización WebP**.
* **Actividades realizadas:**
  * Configuración del **servicio FTP / SFTP** en Ubuntu Server 24: creación de usuario FTP dedicado (`lunnacoco_ftp`), chroot seguro y permisos de carpeta de intercambio (`/var/www/afotica/clientes/lunnadecoco/uploads/ftp-inbox`).
  * Implementación de contenedor **FTP (`Dockerfile.ftp` con `vsftpd` en Alpine, puerto `21` y modo pasivo `30000-30009` detrás de NAT con `FTP_PASV_ADDRESS`)** y soporte paralelo SFTP en **FileZilla**.
  * Integración del flujo de transferencia de archivos con el procesador automático **Google WebP (`cwebp` / `libwebp-tools` + `sharp`)** en el backend (`apps/admin/src/lib/webpOptimizer.ts`): toda imagen subida por FTP o web se convierte a `.webp` optimizado y el archivo original sin optimizar se borra automáticamente.
* **Evidencias esperadas:** Registro de usuarios y permisos FTP, captura de transferencia múltiple desde FileZilla hacia `uploads/ftp-inbox`, log de conversión a `.webp` con borrado del original y copia multimedia en `/var/www/afotica/backups/media`.

### 5. **Emiliano Rodriguez Vazquez**
* **Bloque asignado:** **Opción 1 (Actividad 2 — Sitio Web, Dominio y DNS) — Publicación del E-Commerce, Galería y Resolución por Nombre de Dominio**.
* **Actividades realizadas:**
  * Configuración y publicación del **sitio web completo de comercio electrónico ("Lunna de Coco")**:
    * **Frontend público (`lunnadecoco-storefront`, Astro 4 SSR):** catálogo interactivo, categorías Bento Grid 2D, nueva **Galería (`/galeria`)** asimétrica desfasada tipo Pinterest con Lightbox `<dialog>`, carrito persistente, envío y Checkout Pro Mercado Pago.
    * **Panel CMS (`lunnadecoco-admin`, Next.js 14):** gestión de productos (con soporte multi-imagen desde galería), categorías, diseño/apariencia, cupones, órdenes y módulo `/galeria` con pestañas de subida masiva y acomodo automático inteligente (3, 4 o 5 columnas).
  * Configuración de **nombre de dominio y registros DNS (`A`)** en Cloudflare para `lunnadecoco.com` (`@`, `www`, `admin` → `4.154.18.17`), coordinando modo `DNS only` durante la emisión SSL y `Full (strict)` para proxy.
* **Evidencias esperadas:** Captura de zona DNS con registros `@`, `www`, `admin`, verificación `nslookup` y capturas funcionales de `https://lunnadecoco.com`, `/galeria` y `https://admin.lunnadecoco.com`.

### 6. **Reynaldo Daniel De Loera Guerrero**
* **Bloque asignado:** **Opción 1 (Actividad 2 — Servidor Web / Deploy) — Servidor Web Caddy en Ubuntu Server 24, Docker y Arquitectura Multi-Cliente**.
* **Actividades realizadas:**
  * Instalación de **Docker Engine y Docker Compose** en **Ubuntu Server 24.04 LTS** y creación de la red externa compartida `afotica_caddy_net`.
  * Configuración e implementación del **servidor web Caddy (`caddy:2-alpine`)** como Reverse Proxy HTTPS central en `/var/www/afotica/caddy/Caddyfile` y `docker-compose.yml`:
    * Emisión y renovación automática de certificados **SSL/TLS (Let's Encrypt)** y soporte HTTP/3 para `lunnadecoco.com` y `admin.lunnadecoco.com`.
    * Redirección permanente `301` de `www.lunnadecoco.com` → `https://lunnadecoco.com` (evitando dividir el carrito entre orígenes).
    * Enrutamiento inverso hacia `lunnadecoco-storefront:4321` y `lunnadecoco-admin:3001` (con `X-Forwarded-Host` para Server Actions de Next.js).
    * Optimización y seguridad HTTP en Caddy: compresión `gzip`/`zstd`, servicio estático directo de `/uploads/*` con caché inmutable, bloqueo `403` de rutas internas (`.cms-data`, `*.json`, `ftp-inbox`, `.tmp-optimize`) y cabeceras `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  * Orquestación del despliegue productivo (`docker-compose.prod.yml`), validación de healthchecks `/api/health` y monitoreo de logs de Caddy.
* **Evidencias esperadas:** Captura de `/var/www/afotica/caddy/Caddyfile`, salida de `docker compose ps` mostrando los contenedores activos/saludables, logs de Caddy obteniendo certificados TLS y pruebas `curl -I https://lunnadecoco.com/api/health`.

---

## 3. Arquitectura Técnica Real Verificada del Proyecto

### 3.1 Infraestructura en Ubuntu Server 24.04 LTS
* **Host / VM:** Azure VM `afotica` (grupo de recursos `afotica_group`), **Ubuntu Server 24.04 LTS**, IP Pública `4.154.18.17`.
* **Puertos abiertos en infraestructura:**
  * `22/TCP`: SSH y SFTP (`afotica_key.pem`).
  * `80/TCP` y `443/TCP+UDP`: Servidor Web **Caddy** (HTTP → HTTPS automático, TLS Let's Encrypt y HTTP/3 QUIC).
  * `21/TCP` y `30000-30009/TCP` *(perfil FTP opcional `--profile ftp`)*: Servidor `vsftpd`.
  * `5434/TCP`: PostgreSQL ligado exclusivamente a `127.0.0.1` (cerrado a Internet).
* **Árbol oficial en el servidor (`/var/www/afotica/`):**
  ```text
  /var/www/afotica/
  ├── caddy/
  │   ├── docker-compose.yml   # Servicio central afotica-caddy
  │   └── Caddyfile            # Dominios lunnadecoco.com, www y admin.lunnadecoco.com
  ├── clientes/
  │   ├── lunnadecoco/         # Código clonado de Tienda-Lunna-de-coco.git
  │   │   ├── .env
  │   │   ├── docker-compose.prod.yml
  │   │   └── uploads/
  │   │       ├── .cms-data/   # Respaldo JSON sincronizado
  │   │       └── ftp-inbox/   # Bandeja vigilada FTP/SFTP -> conversión Google WebP
  │   └── cliente_futuro/      # Espacio multi-tenant para nuevos clientes de Afótica
  └── backups/
      ├── bases_de_datos/      # Dumps diarios .sql.gz (docker/backup.sh)
      └── media/               # Respaldos diarios .tar.gz de uploads/
  ```

### 3.2 Stack de Software Real
* **Servidor Web / Reverse Proxy:** Caddy 2 (`caddy:2-alpine`).
* **Tienda Pública (Storefront):** Astro 4 (`node:22-alpine`, SSR puerto `4321`), Tailwind CSS, Nanostores, View Transitions, Galería Pinterest desfasada con Lightbox nativo `<dialog>`.
* **Panel CMS Admin:** Next.js 14 (`node:22-alpine` + `libwebp-tools` `cwebp` + `sharp`), autenticación por cookie firmada HMAC-SHA256, subida múltiple WebP con borrado de archivos originales, Grid Editor 2D (categorías y galería 3/4/5 cols con algoritmo de acomodo automático) y selector multimedia multi-foto.
* **Base de Datos:** PostgreSQL 16 (`postgres:16-alpine`) con Drizzle ORM.
* **FTP / Transferencia de archivos:** Contenedor `vsftpd` (`Dockerfile.ftp` con Alpine 3.20) y soporte SFTP sobre puerto `22`, conectado a carpeta de intercambio `uploads/ftp-inbox`.
* **Dominios configurados:** `https://lunnadecoco.com` (tienda), `https://www.lunnadecoco.com` (redirige 301 a raíz), `https://admin.lunnadecoco.com` (CMS).

---

## 4. Bitácora de Trabajo Base (Formato Oficial Exigido por el PDF)

> La rúbrica exige la tabla: **Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados**, demostrando participación clara de los **6 integrantes**.

| Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados y solución |
| :--- | :--- | :--- | :--- |
| `[Semana 1 - Fecha]` | Aprovisionamiento de Ubuntu Server 24.04 LTS (`afotica`), configuración de red, apertura de puertos en NSG/firewall y creación de árbol `/var/www/afotica` con permisos de usuarios. | **Angel Santiago Ruiz Garcia** | **Problema:** Los puertos web `80` y `443` venían cerrados por defecto en la red de la VM en Azure y `/var/www` pertenecía a `root`. **Solución:** Se agregaron reglas de entrada TCP/UDP en Networking de Azure y se aplicó `chown -R $USER:$USER /var/www/afotica`. |
| `[Semana 1 - Fecha]` | Configuración de OpenSSH Server en Ubuntu Server 24, autenticación con llave privada `afotica_key.pem` y pruebas de acceso remoto desde equipos cliente. | **Carlos Eduardo Casillas Gallardo** | **Problema:** OpenSSH en Windows rechazaba la conexión con el error `UNPROTECTED PRIVATE KEY FILE!` por permisos heredados de la carpeta Descargas. **Solución:** Se ejecutó `icacls .\afotica_key.pem /inheritance:r` y `/grant:r` para restringir lectura al propietario y validar acceso SSH seguro. |
| `[Semana 2 - Fecha]` | Despliegue de PostgreSQL 16 en contenedor aislado, creación de BD `lunnadecoco`, usuario/permisos, esquema SQL (`init.sql`) e integración con Drizzle ORM y `backup.sh`. | **Ian Luis Garcia Gutierrez** | **Problema:** El script `docker/backup.sh` ejecutado por `cron` no cargaba variables `.env` y tenía riesgo de saltos de línea Windows CRLF al clonarse/editarse. **Solución:** Se actualizó `backup.sh` con formato `LF` puro y carga automática segura de `.env` (`source <(tr -d '\r' < .env)`), guardando respaldos separados en `bases_de_datos/` y `media/`. |
| `[Semana 2 - Fecha]` | Configuración de usuario FTP (`lunnacoco_ftp`), carpeta `uploads/ftp-inbox`, servicio `vsftpd` (`Dockerfile.ftp`) y transferencia con FileZilla + conversión Google WebP (`cwebp`) con borrado de originales. | **Monika Johana Baeza Hernandez** | **Problema:** Al probar la optimización y borrado inmediato del archivo original en Windows, `sharp`/`libvips` mantenía bloqueado el descriptor del archivo (`EBUSY`); y en FTP detrás de NAT fallaba el listado en modo pasivo sin IP explícita. **Solución:** Se desactivó caché de descriptores (`sharp.cache(false)`), se procesó en memoria vía `Buffer` antes del `unlink` y se configuró `FTP_PASV_ADDRESS` con puertos `30000-30009`. |
| `[Semana 3 - Fecha]` | Publicación de Storefront Astro y CMS Admin Next.js (`lunnadecoco.com`), configuración de registros DNS en Cloudflare (`@`, `www`, `admin`) e implementación de Galería Pinterest y selector multi-foto. | **Emiliano Rodriguez Vazquez** | **Problema:** El subdominio `admin.lunnadecoco.com` y `www` no estaban creados inicialmente en DNS y la nube naranja (`Proxied`) en Cloudflare podía interferir con la validación SSL inicial. **Solución:** Se crearon los registros `A` faltantes apuntando a `4.154.18.17` y se dejó temporalmente en `DNS only` antes de pasar a `Full (strict)`. |
| `[Semana 3 - Fecha]` | Instalación de Docker en Ubuntu Server 24 y despliegue del servidor web **Caddy (`caddy:2-alpine`)** con `Caddyfile` multi-cliente, SSL automático, compresión, cabeceras de seguridad y `docker-compose.prod.yml`. | **Reynaldo Daniel De Loera Guerrero** | **Problema:** Existía una duplicidad de direcciones de sitio en la versión previa de `Caddyfile` y riesgo de bucle `ERR_TOO_MANY_REDIRECTS`; además de error al pegar YAML en consola bash. **Solución:** Se reescribió el `Caddyfile` con bloques únicos (`www` redirigiendo 301 a raíz, storefront y admin separados), seguridad `/uploads/.*` → `403`, y creación limpia mediante `cat << 'EOF'`. |

---

## 5. Checklist de Evidencias (Capturas para el Documento Técnico PDF)

### Evidencias Opción 3 (Infraestructura Linux, SSH, FTP en Ubuntu Server 24)
1. `[CAPTURA_1]` Consola de **Ubuntu Server 24.04 LTS** mostrando versión (`lsb_release -a`), configuración de red (`ip a`) y árbol `/var/www/afotica` con permisos (`ls -la /var/www/afotica`).
2. `[CAPTURA_2]` Reglas de red / firewall (Azure NSG puertos `22`, `80`, `443` abiertos).
3. `[CAPTURA_3]` Conexión remota **SSH** exitosa con llave `afotica_key.pem` y registro de usuarios del sistema (`/etc/passwd` o `groups`).
4. `[CAPTURA_4]` Cliente **FileZilla** conectado transfiriendo múltiples imágenes hacia la carpeta de intercambio `uploads/ftp-inbox`, acompañado de captura mostrando que ya se convirtieron a `.webp` y el archivo original fue eliminado.
5. `[CAPTURA_5]` Ejecución de respaldo `docker/backup.sh` generando archivos en `/var/www/afotica/backups/bases_de_datos` y `/var/www/afotica/backups/media`.

### Evidencias Opción 1 (Servidor Web Caddy, Dominio y Base de Datos PostgreSQL)
6. `[CAPTURA_6]` Configuración del servidor web **Caddy** (`/var/www/afotica/caddy/Caddyfile` y `docker-compose.yml`).
7. `[CAPTURA_7]` Salida de `docker compose ps` y logs de `afotica-caddy` confirmando emisión de certificado **HTTPS/SSL**.
8. `[CAPTURA_8]` Panel de DNS mostrando registros `A` (`lunnadecoco.com`, `www`, `admin` → `4.154.18.17`) y `nslookup`.
9. `[CAPTURA_9]` Base de datos **PostgreSQL 16** operativa (tablas `products`, `categories`, `orders`, `media_items`, `gallery_settings`) y comprobación de salud `curl /api/health`.
10. `[CAPTURA_10]` Sitio web público **`https://lunnadecoco.com`**, página **`/galeria`** (grid asimétrico tipo Pinterest + Lightbox) y panel CMS **`https://admin.lunnadecoco.com/galeria`** operando con candado SSL válido.

---

## 6. Guión de Presentación Final (15–20 minutos entre 6 Integrantes)

1. **Minutos 0:00–3:00 — Angel Santiago Ruiz Garcia:** Introducción del proyecto e-commerce (**Lunna de Coco / Afótica**), arquitectura combinada **Opción 1 + Opción 3** sobre **Ubuntu Server 24**, red, firewall y árbol `/var/www/afotica`.
2. **Minutos 3:00–6:00 — Carlos Eduardo Casillas Gallardo:** Demostración de administración remota segura vía **SSH** con llave `afotica_key.pem`, permisos ACL y buenas prácticas de acceso.
3. **Minutos 6:00–9:00 — Ian Luis Garcia Gutierrez:** Demostración de **PostgreSQL 16**, aislamiento de red interna, tablas relacionales, persistencia en vivo y respaldo con `backup.sh`.
4. **Minutos 9:00–12:00 — Monika Johana Baeza Hernandez:** Demostración del **servicio FTP / SFTP** en FileZilla hacia `uploads/ftp-inbox`, conversión automática con **Google WebP (`cwebp`)** y eliminación del original.
5. **Minutos 12:00–15:30 — Emiliano Rodriguez Vazquez:** Resolución por dominio (`lunnadecoco.com`, `admin.lunnadecoco.com`), navegación por la tienda en vivo, **Galería Pinterest (`/galeria`)** y gestión multi-foto desde el CMS.
6. **Minutos 15:30–18:30 — Reynaldo Daniel De Loera Guerrero:** Arquitectura de **Caddy en Ubuntu Server 24** (`Caddyfile`, SSL automático Let's Encrypt, proxy inverso hacia Astro/Next.js en Docker y escalamiento multi-cliente).
7. **Minutos 18:30–20:00 — Todo el equipo:** Conclusiones finales y ronda de preguntas individuales.

---

## 7. Prompt / Instrucciones Directas para la Otra Inteligencia Artificial

Copia y pega este archivo junto con este prompt en tu otra IA para generar el documento final:

```text
Lee completo este archivo Markdown. El proyecto corresponde a la materia "Sistemas Operativos y Servicios en Red" (7° Semestre, Licenciatura en Comercio Electrónico) y combina exclusivamente la Opción 1 (Servidor Web para Comercio Electrónico en Linux) y la Opción 3 (Infraestructura de Servicios de Red en Linux) sobre Ubuntu Server 24.04 LTS, utilizando Caddy como servidor web / reverse proxy HTTPS en producción. No incluyas nada de Windows Server ni Active Directory.

Redacta el Documento Técnico completo listo para exportar a PDF con:
1. Portada (con los 6 integrantes reales), Índice, Introducción, Objetivos (General y Específicos), Desarrollo del Proyecto (justificando técnicamente el uso equivalente moderno de Caddy + Astro/Next.js + PostgreSQL 16 sobre Ubuntu Server 24), Configuraciones Realizadas (usando los datos reales del Caddyfile, SSH, FTP, Docker y PostgreSQL descritos en la Sección 3), Sección de Evidencias (marcando exactamente dónde pegar cada [CAPTURA_1] a [CAPTURA_10]), Resultados Obtenidos, Conclusión General (mínimo 350 palabras) + 6 Conclusiones Individuales (una por cada integrante según su rol), y Bibliografía en formato APA.
2. Bitácora de Trabajo completa en tabla con las columnas: Fecha | Actividad Realizada | Integrante Responsable | Problemas presentados.
3. Un bloque extra al final con 2 posibles preguntas de evaluación oral individual y su respuesta modelo para cada uno de los 6 integrantes según lo que configuró.
```
