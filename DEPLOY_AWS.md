# Actualizar la app en AWS Lambda

Guía rápida para cuando cambio algo de la app y quiero que la versión de **AWS Lambda** use el código nuevo.

> **La idea clave:** Lambda no lee mi código, corre una **imagen de Docker**: una "foto" congelada de la app en el momento del `docker build`. Si cambio el código, tengo que sacar una foto nueva, subirla a ECR y decirle a Lambda que la use.

```
Código  →  docker build  →  imagen  →  docker push  →  ECR  →  update-function-code  →  Lambda
(cambio)   (saco la foto)              (la subo)                (Lambda empieza a usarla)
```

Vercel, en cambio, se actualiza solo con cada `git push` a `main`.

---

## Los pasos

Todo se corre desde la carpeta del proyecto, en la terminal de **WSL**, con **Docker Desktop abierto**.

### 0. Cargar las variables del `.env`

Una vez por terminal: si abro una terminal nueva, se pierden.

```bash
export $(cat .env | grep -v '^#' | xargs)
```

### 1. Loguear Docker en ECR

El login dura **12 horas**. Si pasó más tiempo, el push da `Unauthorized` y hay que repetir este paso.

```bash
aws ecr get-login-password --region $DEFAULT_AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com
```

### 2. Construir la imagen nueva

Compila el frontend y copia el `api/server.py` nuevo dentro de la imagen.

```bash
docker build --platform linux/amd64 --provenance=false \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .
```

- `--platform linux/amd64`: Lambda corre en amd64.
- `--provenance=false`: sin esto Docker agrega metadatos que Lambda a veces no acepta. **Usarlo siempre.**

### 3. Etiquetar y subir a ECR

```bash
docker tag consultation-app:latest $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest
```

### 4. Decirle a Lambda que use la imagen nueva ⚠️

**Es el paso que más fácil se olvida.** Aunque la imagen nueva se llame igual (`latest`), Lambda guarda la referencia a la imagen exacta que le di la última vez. Sin este paso, sigue corriendo la versión vieja.

```bash
aws lambda update-function-code \
  --function-name consultation-app \
  --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest \
  --region $DEFAULT_AWS_REGION
```

Alternativa por consola: Lambda → `consultation-app` → **Image** → **Deploy new image** → Browse images → `consultation-app` : `latest` → **Save**.

### 5. Probar

Esperar 10–30 segundos y abrir la Function URL. La primera carga tarda más por el **cold start**, mientras arranca el contenedor nuevo.

Checklist:
- [ ] La página carga, y recargar en `/product` no da 404
- [ ] Iniciar sesión con Clerk
- [ ] Generar un resumen con "Use sample notes": el texto aparece **de a poco** (streaming)

---

## ¿Qué cambios necesitan este proceso?

| Si cambio… | ¿Pasos 0–5? |
|---|---|
| Frontend (`pages/`, `components/`, `styles/`) | ✅ Sí |
| `api/server.py` o `requirements.txt` | ✅ Sí |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Sí: queda dentro del JS durante el build |
| Una variable de entorno de Lambda (`OPENAI_API_KEY`, `CLERK_JWKS_URL`, `CLERK_SECRET_KEY`) | ❌ No: se edita en Configuration → Environment variables y Lambda la toma sola |

> **Ojo:** si cambio la lógica del backend, hay que cambiarla en **los dos archivos**:
> - `api/server.py`: usado por AWS (Docker / Lambda)
> - `api/index.py`: usado por Vercel

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `Unauthorized` en el `docker push` | Pasaron más de 12 h desde el login → repetir el paso 1 |
| `Cannot connect to the Docker daemon` | Docker Desktop cerrado, o falta activar la integración con WSL |
| Sigo viendo la versión vieja | Me salteé el paso 4 |
| `exec format error` en los logs | Faltó `--platform linux/amd64` |
| `Runtime exited with error` / 502 | Error de Python al arrancar → mirar los logs (abajo). Casi siempre es una variable de entorno mal copiada |
| El texto aparece todo de golpe | La Function URL está en `BUFFERED` → cambiarla a `RESPONSE_STREAM` |
| 403 con un usuario premium | Si pasa justo después de suscribirse, recargar la página. En WSL2 también puede ser el desfase de reloj |

Ver los logs desde la terminal:

```bash
aws logs tail /aws/lambda/consultation-app --region $DEFAULT_AWS_REGION --since 15m
```

O por consola: Lambda → `consultation-app` → **Monitor** → **View CloudWatch logs**.

---

## Costos y emergencias

- Con uso normal cuesta **casi US$0**: Lambda tiene un free tier permanente, y ECR cobra centavos por la imagen.
- Cada push deja la imagen anterior guardada **sin tag** en ECR. De vez en cuando, borrar las viejas: ECR → `consultation-app` → seleccionar las `untagged` → Delete.
- **Emergencia** (llega una alerta de presupuesto): Lambda → `consultation-app` → **Throttle**. Corta todas las ejecuciones al instante.
