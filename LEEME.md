# Programa VyM – Vida y Ministerio

Programa la reunión de entre semana y descárgala en PDF o Word con el mismo diseño del modelo.
Guía con imágenes: `docs/Tutorial-Programa-VyM.pdf`.

## Subir a GitHub (para usar desde el celular)
1. En github.com crea un repositorio **privado** vacío (ej.: `programa-vym`). Activa la verificación en dos pasos en tu cuenta.
2. En esta carpeta: `git remote add origin https://github.com/TU_USUARIO/programa-vym.git` y `git push -u origin main`.
3. Settings → Pages → Source: **GitHub Actions** (en cuentas gratuitas Pages exige repositorio público; es seguro porque los datos van cifrados, ver abajo).
4. En la pestaña **Actions** se construyen solos: `android-apk`, `instalador-windows` y la página web (iPhone/iPad/tablet: abrir el enlace en Safari → Compartir → Añadir a pantalla de inicio).

## Seguridad
- Los datos de la congregación están en `src/data/seed.enc.json` cifrados (AES-256-GCM, clave derivada del *código de la congregación* con PBKDF2). Sin el código no se pueden leer.
- El repositorio NO contiene datos en claro: `privado/` está en `.gitignore`. **Nunca subas esa carpeta** y guarda el código en un lugar seguro.
- Para cambiar el código o actualizar los datos de ejemplo: edita `privado/seed.json` y ejecuta `node tools/encrypt_seed.mjs "NUEVO-CODIGO"`.
- Lo que cada persona escribe se guarda solo en su dispositivo. PIN opcional en Ajustes.
- Nadie puede modificar el código publicado sin permiso de escritura en tu repositorio: no agregues colaboradores que no conozcas y exige revisión (branch protection) si quieres.

## Windows
Ejecuta `Instalador-Programa-VyM-2.0.0.exe`. Si Windows avisa «editor desconocido»: Más información → Ejecutar de todas formas.

## Desarrollo
`npm ci`, `npm run build:web`, `npm run dist:win`, `npx cap sync android`.
