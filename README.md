# 💳 New GiftCard Shop

Una plataforma moderna y robusta para la compra y venta de Gift Cards, construida con las últimas tecnologías del ecosistema de React y Next.js.

---

## 🚀 Tecnologías Principales

El proyecto utiliza un stack de vanguardia para garantizar rendimiento, escalabilidad y una excelente experiencia de desarrollador:

- **Framework:** [Next.js 15/16](https://nextjs.org/) (App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Autenticación:** [Better Auth](https://better-auth.com/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/) & [Tabler Icons](https://tabler-icons.io/)
- **Validación:** [Zod](https://zod.dev/)

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (Versión 20 o superior recomendada)
- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) (Para la base de datos local)
- [npm](https://www.npmjs.com/) o tu gestor de paquetes preferido

---

## 📦 Instalación y Configuración

Sigue estos pasos para levantar el entorno de desarrollo desde cero:

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/newgiftcardshop.git
cd newgiftcardshop
```

### 2. Instalar dependencias
```bash
npm install
```
> **Nota:** El script `postinstall` ejecutará automáticamente `prisma generate` para generar el cliente de base de datos en `src/generated/prisma`.

### 3. Configurar variables de entorno
Copia el archivo de ejemplo y ajusta los valores según sea necesario:
```bash
cp .env.example .env
```
Asegúrate de que tu `DATABASE_URL` coincida con la configuración de Docker (ver paso siguiente).

### 4. Levantar la Base de Datos (Docker)
Este proyecto incluye un archivo `docker-compose.yml` para facilitar el despliegue de PostgreSQL de forma local.
```bash
docker compose up -d
```
*   **Host:** `localhost`
*   **Puerto:** `5444` (mapeado al 5432 interno)
*   **Usuario:** `username`
*   **Password:** `password`
*   **DB Name:** `default_database`

Tu `DATABASE_URL` en el `.env` debería verse así:
```env
DATABASE_URL="postgresql://username:password@localhost:5444/default_database?schema=public"
```

### 5. Sincronizar el Schema de Prisma
Una vez que la base de datos esté corriendo, aplica el esquema:
```bash
npx prisma db push
```

### 6. (Opcional) Cargar datos de prueba (Seed)
Si deseas poblar la base de datos con usuarios y países iniciales:
```bash
npx prisma db seed
```

---

## 💻 Ejecución en Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📂 Estructura del Proyecto

*   `src/app`: Rutas y lógica de la aplicación (Next.js App Router).
*   `src/components`: Componentes de UI reutilizables.
*   `src/actions`: Server Actions para lógica de negocio.
*   `src/lib`: Utilidades, configuraciones de Prisma y clientes compartidos.
*   `prisma/`: Definición del esquema de la base de datos y scripts de seed.
*   `public/`: Assets estáticos.

---

## 📜 Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Compila la aplicación para producción. |
| `npm run start` | Inicia la aplicación compilada. |
| `npm run lint` | Ejecuta el linter para encontrar errores de código. |
| `npx prisma studio` | Abre una interfaz web para explorar la base de datos. |

---

## 🤝 Contribución

1. Haz un Fork del proyecto.
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz commit (`git commit -m 'Añade nueva funcionalidad'`).
4. Sube los cambios (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

---

Desarrollado con ❤️ para la comunidad de Gift Cards.