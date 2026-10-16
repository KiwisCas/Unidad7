# Unidad 7

Sitio estático interactivo preparado para publicarse en GitHub Pages.

## Publicación con GitHub Actions

1. Sube este proyecto a un repositorio de GitHub usando la rama `main`.
2. En el repositorio, abre **Settings > Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions** como fuente.
4. Haz push a `main` o ejecuta manualmente el workflow **Deploy static site to GitHub Pages** desde la pestaña **Actions**.

El workflow publica directamente la raíz del proyecto; no requiere instalación de dependencias ni un paso de compilación. La URL del sitio aparecerá en el resumen de la ejecución y en **Settings > Pages**.

## Desarrollo local

Abre `index.html` mediante un servidor local, por ejemplo con la extensión Live Server de VS Code. El sitio carga Three.js y Rapier desde CDN, por lo que necesita conexión a Internet.
