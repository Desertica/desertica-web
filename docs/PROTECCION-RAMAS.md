# Proteger las ramas `develop` y `staging`

Objetivo: nadie sube directo a estas ramas; todo entra por Pull Request (PR) y solo se puede fusionar si los checks pasan.

## Antes de empezar

1. Copia los workflows (una sola vez, con un token que tenga permiso `workflow` o desde tu computadora):
   `mkdir -p .github/workflows && cp docs/pipelines/*.yml .github/workflows/`, commit y push.
2. Abre un PR cualquiera hacia `develop` y espera a que corran. **Un check solo aparece en la lista del paso 8 despues de haber corrido al menos una vez.**

## Pasos (repite todo para `develop` y luego para `staging`)

Necesitas ser admin del repositorio.

1. En GitHub abre `Desertica/desertica-web`.
2. Clic en **Settings** (pestana de arriba a la derecha).
3. Menu izquierdo: **Branches**.
4. Clic en **Add branch ruleset** (o **Add classic branch protection rule**; los pasos son equivalentes). Nombre: `proteger-develop`.
5. **Enforcement status**: `Active`. En **Target branches** elige **Add target -> Include by pattern** y escribe `develop` (la segunda vez, `staging`).
6. Marca **Restrict deletions** y **Block force pushes**.
7. Marca **Require a pull request before merging**, con **Required approvals: 1** y **Require review from Code Owners** (hay un `CODEOWNERS` en el repo).
8. Marca **Require status checks to pass**, tambien **Require branches to be up to date before merging**, y con **Add checks** agrega exactamente estos nombres:

   | Check               | Que hace                                       | Workflow     |
   | ------------------- | ---------------------------------------------- | ------------ |
   | `commit-policy`     | sin Co-Authored-By ni ramas `claude/*`         | ci.yml       |
   | `format`            | Prettier en los archivos que toca el PR        | ci.yml       |
   | `test-build`        | tests, build y prueba de arranque del servidor | ci.yml       |
   | `codeql`            | analisis de codigo                             | security.yml |
   | `dependency-review` | dependencias nuevas vulnerables                | security.yml |
   | `secrets`           | gitleaks, busca secretos                       | security.yml |
   | `audit`             | `npm audit` de produccion, nivel high          | security.yml |
   | `dockerfile-lint`   | hadolint al Dockerfile                         | security.yml |
   | `image`             | construye y escanea la imagen                  | docker.yml   |

9. Clic en **Create**.

## Comprobar

Abre un PR hacia la rama protegida: el boton de merge debe estar bloqueado hasta que todos los checks esten en verde y haya 1 aprobacion. Un `git push` directo debe ser rechazado.

## Si algo falla

- El check no aparece en el buscador: aun no ha corrido; haz push a un PR y espera.
- El check queda en "Expected - Waiting": el nombre esta mal escrito o el workflow no esta en `.github/workflows`.
- `main` se protege igual (mismos checks); el flujo completo esta en `docs/pipelines/README.md`.
