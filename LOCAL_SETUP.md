# Local Setup

## 1) Variables de entorno

Crear `web/.env` (no commitear). Podes copiar `web/.env.example`.

Minimo para correr la app:
- `DATABASE_URL="file:./dev.db"`

Para emails:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=tu@gmail.com`
- `SMTP_PASS=APP_PASSWORD` (Gmail requiere 2FA + App Password)
- `NOTIFY_EMAIL_FROM=Afiliaciones <tu@gmail.com>`
- `NOTIFY_EMAIL_TO=destino@...` (separado por comas si son varios)
- `NOTIFY_TIMEZONE=America/New_York`

Opcional:
- `DAILY_EMAIL_ENABLED=true`
- `APP_PASSWORD=...` y `APP_AUTH_SECRET=...` para proteger la app con login.

## 2) Correr la app

```bash
cd web
npm run dev
```

## 3) Enviar reportes manualmente

Reporte semanal:
```bash
cd web
npm run cron:weekly
```

Recordatorio diario (recomendado para que el aviso caiga el dia exacto):
```bash
cd web
npm run cron:daily
```

Sync de matriz (recomendado correr diariamente para auto-reparar faltantes):
```bash
cd web
npm run cron:sync
```

Backup (JSON en `web/.tmp/backups`):
```bash
cd web
npm run backup
```

## 4) Programar tareas en Windows (Task Scheduler)

Ejecuta este script para crear 4 tareas:
- Diario: Sync matriz 07:40
- Semanal: Backup domingo 06:30
- Semanal: Reporte lunes 08:10
- Diario: 08:00 (solo envia si `DAILY_EMAIL_ENABLED=true`)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "web\scripts\schedule-local-tasks.ps1"
```
