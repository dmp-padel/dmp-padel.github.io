# Web del DMP Pádel

Web de resultados de liga y copa, clasificaciones, jugadores y noticias de los equipos del DMP en la Liga Bizkaina.
Se actualiza sola con los datos de la Federación Bizkaina de Pádel:

- **Domingo 23:30** (hora de invierno; 00:30 en verano)
- **Lunes 9:00** (segunda pasada, por si los resultados se meten tarde)

## Puesta en marcha (una sola vez)

1. Crea un repositorio nuevo en GitHub (por ejemplo `dmp-padel`). Puede ser público o privado
   (para usar GitHub Pages con un repositorio privado hace falta un plan de pago).
2. Sube **todo el contenido** de esta carpeta, incluida la carpeta oculta `.github`.
   Lo más fácil:
   ```bash
   cd dmp-web
   git init -b main && git add . && git commit -m "Web DMP"
   git remote add origin https://github.com/TU_USUARIO/dmp-padel.git
   git push -u origin main
   ```
3. **Settings → Actions → General → Workflow permissions** → marca *Read and write permissions* → Save.
4. **Settings → Pages** → *Source: Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.
   En un par de minutos la web estará en `https://TU_USUARIO.github.io/dmp-padel/`.
5. Pruébalo: **Actions → Actualizar resultados de la Federación → Run workflow**.
   Si sale en verde, ya está: a partir de ahí se actualiza solo.

Si un día falla (la web de la Federación caída o cambiada), GitHub te avisa por correo y la web
se queda con los últimos datos buenos; no se borra nada.

## Cosas que se cambian a mano

| Qué | Dónde |
|---|---|
| Noticias | `data/noticias.json` (las fotos van en `fotos/`) |
| Nombre del club, sede, temporada | `data/club.json` |
| Equipos que se siguen (nueva temporada, cambio de grupo…) | `data/config.json` |
| Diseño y asistente X3 | `src/app.css`, `src/app.js` |

Después de cambiar algo a mano, lanza el workflow (paso 5) o ejecuta en local:

```bash
pip install -r requirements.txt
python scripts/build.py            # solo monta la web con los datos actuales
python scripts/scrape.py && python scripts/build.py   # baja datos nuevos y monta
```

### Nueva temporada o cambio de grupo

En la web de la Federación, abre la clasificación del grupo. La dirección tiene esta forma:
`.../Home/JornadaLiga/35?fase=61&grupoId=62&jornada=1`
Copia esos tres números en `data/config.json` (`comp`, `fase`, `grupo`) y pon en `equipo`
el nombre exacto con el que aparece en la clasificación.

Para la copa: en esa misma página elige la fase **KOPA** en el desplegable. La dirección pasa a ser
`.../Home/CuadroLiga?faseId=276`; ese número va en `copa_fase` (y el nombre que quieras mostrar en `copa_nombre`).
Si un año no hay copa, borra esas dos líneas.

## Nota

GitHub puede retrasar unos minutos las tareas programadas, y las pausa si un repositorio pasa
60 días sin actividad. Como el robot guarda la fecha de actualización cada semana, en temporada
eso no debería pasar; al empezar una temporada nueva, comprueba en **Actions** que siga activo.
