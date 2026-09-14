# Landing Axis POS (estática, para cPanel)

Sin build ni dependencias: HTML + CSS + JS planos.

## Subir a cPanel
1. Comprime la carpeta `landing/` (o usa `axis-landing.zip`).
2. cPanel → Administrador de archivos → `public_html/` (o el subdominio).
3. Sube el zip y extráelo ahí. `index.html` debe quedar en la raíz.
4. Listo. El `.htaccess` fuerza HTTPS y activa compresión/caché.

## Personalizar
Todo está en `assets/main.js`, bloque `CONFIG`:
- `appUrl`: enlace de "Iniciar sesión".
- `whatsapp`: número con indicativo, sin `+` (ej. `573001234567`). El botón flotante y el formulario abren WhatsApp con el mensaje.
- `prices`: precio mensual por plan en COP (`mini`, `starter`, `growth`), `null` muestra "Consultar".
- Redes y enlaces legales.

Textos: directamente en `index.html`. Colores y tipografía: variables al inicio de `assets/styles.css` (`--accent` es el rojo Axis).
