# SIGOT-FTTH

**Sistema Inteligente de Gestión de Órdenes de Trabajo FTTH**

SIGOT-FTTH es una aplicación web desarrollada para centralizar y apoyar la gestión de órdenes de trabajo FTTH. Permite importar archivos Excel exportados desde OFSC, gestionar órdenes y técnicos, realizar asignaciones manuales y automáticas, consultar el seguimiento de las OTs, visualizar indicadores, generar reportes y mantener trazabilidad mediante auditoría.

## Funcionalidades principales

- Inicio de sesión y control de acceso por roles.
- Dashboard con indicadores operativos.
- Importación y sincronización de archivos Excel exportados desde OFSC.
- Control de órdenes de trabajo.
- Gestión de técnicos.
- Asignación manual y automática.
- Reasignación y cancelación de asignaciones.
- Gestión de estados operativos de las OTs.
- Seguimiento de eventos por OT.
- Mapa de órdenes con coordenadas disponibles.
- Reportes operativos y exportación a Excel.
- Auditoría de acciones.
- Gestión de usuarios.

## Tecnologías

### Backend
- Node.js
- Express
- SQL Server
- JWT
- bcryptjs
- Multer
- XLSX

### Frontend
- React
- Create React App (`react-scripts`)
- Axios
- Chart.js
- Leaflet / React Leaflet
- React Router
- XLSX

### Base de datos
- Microsoft SQL Server 2022 Express
- SQL Server Management Studio (SSMS)

## Estructura principal

```text
SIGOT-FTTH/
├── database/
│   ├── 01_DATOS_INICIALES.sql
│   ├── 03_indice_unico_tecnicos.sql
│   ├── 04_indice_unico_usuarios.sql
│   ├── 05_historial_asignaciones.sql
│   └── SIGOT_FTTH_ENTREGA.bak
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── src/
├── uploads/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Requisitos previos

Se recomienda instalar:

- **Node.js 22.x** (el proyecto fue desarrollado con Node.js 22.17.0).
- **npm 10.x** o superior.
- **SQL Server 2022 Express**.
- **SQL Server Management Studio (SSMS)**.
- **Git**.
- Navegador web actualizado.

## 1. Clonar el repositorio

```bash
git clone https://github.com/otanerweed/SIGOT-FTTH.git
cd SIGOT-FTTH
```

## 2. Restaurar la base de datos

El proyecto incluye una base de datos limpia para evaluación:

```text
database/SIGOT_FTTH_ENTREGA.bak
```

Esta copia contiene la estructura completa del sistema, cuatro roles, cinco técnicos de prueba y un usuario administrador de demostración. No contiene órdenes ni datos operativos de clientes.

### Restauración mediante SSMS

1. Abrir **SQL Server Management Studio**.
2. Conectarse a la instancia de SQL Server, por ejemplo:
   ```text
   localhost\SQLEXPRESS
   ```
3. Clic derecho en **Bases de datos**.
4. Seleccionar **Restaurar base de datos...**
5. En **Origen**, seleccionar **Dispositivo**.
6. Pulsar `...` y luego **Agregar**.
7. Seleccionar:
   ```text
   <RUTA_DEL_PROYECTO>\database\SIGOT_FTTH_ENTREGA.bak
   ```
8. En **Destino**, utilizar:
   ```text
   SIGOT_FTTH_ENTREGA
   ```
9. Pulsar **Aceptar** y esperar la confirmación de restauración.

> Si SSMS informa que las rutas físicas de los archivos no son válidas, entrar en la página **Archivos** de la restauración y seleccionar la opción para reubicar los archivos en la carpeta de datos predeterminada del servidor.

## 3. Configurar las variables de entorno

En la raíz del proyecto existe:

```text
.env.example
```

Crear una copia llamada:

```text
.env
```

Ejemplo:

```env
PORT=3001

DB_SERVER=localhost\SQLEXPRESS
DB_PORT=1433
DB_DATABASE=SIGOT_FTTH_ENTREGA
DB_USER=sa
DB_PASSWORD=TU_PASSWORD_SQL_SERVER

JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_SEGURA
JWT_EXPIRES_IN=8h
```

### Importante

- Cambiar `DB_USER` y `DB_PASSWORD` por las credenciales locales de SQL Server.
- Si la instancia no se llama `SQLEXPRESS`, modificar `DB_SERVER`.
- No subir el archivo `.env` al repositorio.

## 4. Instalar y levantar el backend

Desde la raíz del proyecto:

```bash
npm install
```

Para desarrollo:

```bash
npm run dev
```

También puede iniciarse con:

```bash
npm start
```

El backend se ejecuta en:

```text
http://localhost:3001
```

Mantener esta terminal abierta.

## 5. Instalar y levantar el frontend

Abrir una segunda terminal:

```bash
cd frontend
npm install
npm start
```

El frontend se abrirá normalmente en:

```text
http://localhost:3000
```

Mantener esta segunda terminal abierta.

## 6. Credenciales de demostración

Una vez restaurada la base `SIGOT_FTTH_ENTREGA`, ingresar con:

```text
Usuario: admin_demo
Contraseña: Sigot2026!
Rol: Administrador
```

Estas credenciales son únicamente para evaluación académica y pruebas locales.

## 7. Prueba recomendada del sistema

La base de entrega se encuentra limpia para permitir una evaluación desde cero.

### Flujo sugerido

1. Iniciar sesión con `admin_demo`.
2. Revisar el Dashboard.
3. Ingresar a **Importar OFSC**.
4. Seleccionar un archivo `.xlsx` o `.xls` exportado desde OFSC.
5. Ejecutar **Importar y sincronizar**.
6. Revisar las órdenes importadas en **Órdenes**.
7. Verificar los técnicos disponibles.
8. Ejecutar **Asignación automática** o realizar una asignación manual.
9. Revisar el resultado en **Asignaciones**.
10. Consultar los eventos generados en **Seguimiento OT**.
11. Revisar **Auditoría**.
12. Consultar **Reportes** y probar la exportación a Excel.
13. Revisar el **Mapa** para las órdenes que tengan coordenadas válidas.

## 8. Importación desde OFSC

SIGOT-FTTH **no se conecta directamente a OFSC**.

El flujo actual es:

```text
OFSC
  ↓
Exportar archivo Excel
  ↓
SIGOT-FTTH
  ↓
Importar y sincronizar
```

El sistema identifica órdenes nuevas y órdenes ya existentes. Si una OT ya se encuentra registrada, se actualiza su información en lugar de crear un duplicado.

Formatos permitidos:

```text
.xlsx
.xls
```

## 9. Roles

### Administrador
Acceso completo al sistema.

### Coordinador
Orientado a la operación diaria, importación, órdenes, técnicos, asignaciones, seguimiento y reportes.

### Supervisor
Orientado a consulta, seguimiento, indicadores, reportes y auditoría.

### Consulta
Acceso principalmente de lectura.

## 10. Módulos

### Dashboard
Muestra indicadores generales de órdenes, estados, técnicos y operaciones.

### Importar OFSC
Carga y sincroniza archivos Excel exportados desde OFSC y conserva un historial de importaciones.

### Órdenes
Permite buscar, consultar y revisar el detalle y estado de las OTs.

### Técnicos
Permite registrar y administrar técnicos, capacidad, distrito base, disponibilidad y estado.

### Asignaciones
Permite asignación manual, automática, reasignación y cancelación.

### Seguimiento OT
Permite consultar los eventos registrados para cada asignación u orden.

### Mapa
Muestra geográficamente las órdenes que cuentan con coordenadas válidas. Puede requerir conexión a Internet para cargar las capas del mapa.

### Reportes
Muestra indicadores consolidados y permite exportar información a Excel.

### Auditoría
Registra acciones realizadas en el sistema y el usuario responsable.

### Usuarios
Permite al Administrador gestionar usuarios y roles.

## 11. Base de datos de entrega

La copia incluida:

```text
database/SIGOT_FTTH_ENTREGA.bak
```

fue preparada específicamente para evaluación.

Estado inicial:

```text
ActividadesOFSC          0
Asignaciones             0
Evidencias               0
HistorialAsignaciones    0
HistorialEstadosOT       0
NAPs                     0
Operaciones              0
OrdenesTrabajo           0
SeguimientoOT            0

Roles                    4
Tecnicos                 5
Usuarios                 1
```

El único usuario incluido es `admin_demo`.

## 12. Archivo `01_DATOS_INICIALES.sql`

El archivo:

```text
database/01_DATOS_INICIALES.sql
```

contiene datos mínimos de configuración, incluidos los roles y el usuario administrador de demostración.

**No es necesario ejecutarlo si se restauró correctamente `SIGOT_FTTH_ENTREGA.bak`, porque el respaldo ya contiene estos datos.**

## 13. Principales endpoints

### Importación

```http
POST /api/importador/ofsc
GET  /api/importador/ordenes
```

El archivo de importación se envía mediante `multipart/form-data` utilizando el campo:

```text
archivo
```

### Asignaciones

```http
POST /api/asignaciones/automatica
```

### Seguimiento

```http
GET /api/seguimiento
GET /api/seguimiento/asignacion/:idAsignacion
```

### Estado de órdenes

```http
PATCH /api/ordenes/:id/estado
```

## 14. Problemas frecuentes

### No conecta con SQL Server

Verificar:

- Que `SQL Server (SQLEXPRESS)` esté iniciado.
- Que `DB_SERVER` coincida con el nombre de la instancia.
- Que la autenticación SQL Server esté habilitada si se utiliza el usuario `sa`.
- Que `DB_USER` y `DB_PASSWORD` sean correctos.
- Que la base `SIGOT_FTTH_ENTREGA` haya sido restaurada.

### El puerto 3001 está ocupado

En Windows:

```powershell
netstat -ano | findstr :3001
```

Cerrar el proceso que utiliza el puerto o cambiar `PORT` en `.env`.

### El puerto 3000 está ocupado

Cerrar el proceso correspondiente o aceptar otro puerto cuando React lo solicite.

### Error al importar Excel

Comprobar:

- Que sea `.xlsx` o `.xls`.
- Que el archivo mantenga la estructura esperada de una exportación OFSC.
- Que la carpeta `uploads` exista.
- Que el backend esté funcionando.

### El mapa no carga

Verificar conexión a Internet y que las órdenes contengan coordenadas válidas.

## 15. Seguridad

- `.env` está excluido del repositorio.
- No se incluyen contraseñas personales.
- La base de evaluación no contiene OTs ni información operativa de clientes.
- Las rutas protegidas utilizan autenticación JWT.
- Los permisos del sistema dependen del rol del usuario.
- La contraseña `Sigot2026!` es exclusivamente de demostración.

## 16. Comandos rápidos

### Backend

```bash
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Acceso

```text
http://localhost:3000
```

### Usuario demo

```text
admin_demo
Sigot2026!
```

## 17. Mejoras futuras

- Integración directa con OFSC.
- Despliegue en infraestructura cloud.
- Evidencias operativas.
- Notificaciones.
- Mejoras de geolocalización.
- Escalabilidad para mayor volumen de órdenes.

---

**SIGOT-FTTH — Sistema Inteligente de Gestión de Órdenes de Trabajo FTTH**
