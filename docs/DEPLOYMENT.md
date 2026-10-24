# Deploy to Railway

This deploys the existing Express API and React frontend together, with SQLite on a persistent volume. The application remains usable locally through the existing setup commands.

## Service configuration

1. Connect Railway to the GitHub repository `aditya9515/dealership-inventory` and select the `main` branch.
2. Attach a volume mounted at **`/app/data`** before the production deployment. A local file outside a mounted volume will not survive replacement of a container.
3. Set the environment variables below. Generate a new random signing secret; do not reuse the example value or commit it to Git.
4. Deploy the service and generate an HTTPS public domain for the service's `PORT`.
5. Check `/api/health`, sign in, and exercise a purchase. Restart the service and confirm that stock remains changed.

`railway.json` selects Railpack, builds with `pnpm build`, and starts the compiled demo seed followed by the compiled server. `.node-version` and `packageManager` pin the runtime and package manager. The health check waits for `/api/health` before routing traffic.

| Variable                 | Value                                          |
| ------------------------ | ---------------------------------------------- |
| `NODE_ENV`               | `production`                                   |
| `DATABASE_PATH`          | `/app/data/dealership.db`                      |
| `JWT_SECRET`             | A new random value with at least 32 characters |
| `CLIENT_IP_SOURCE`       | `railway`                                      |
| `SEED_ADMIN_EMAIL`       | `admin@demo.local`                             |
| `SEED_ADMIN_PASSWORD`    | `AdminDemo123!`                                |
| `SEED_CUSTOMER_EMAIL`    | `customer@demo.local`                          |
| `SEED_CUSTOMER_PASSWORD` | `CustomerDemo123!`                             |

Railway supplies `PORT`; do not hardcode a separate port in the hosting service. Railpack avoids the root-owned volume permissions issue that would need additional configuration with the supplied non-root Docker image.

The public credentials above are for a shared assessment demo. Use them only with sample inventory. To use private accounts instead, change the seed variables before first launch and replace the frontend's demo shortcuts. The seed command never overwrites existing passwords or promotes an existing customer account. It populates sample vehicles when the catalogue is empty; with the demo startup command this also happens after a restart of a deliberately emptied catalogue.

## Client IP handling

Railway documents `X-Real-IP` as the remote client address. `CLIENT_IP_SOURCE=railway` enables that header only for the login limiter, with IP validation and IPv6 normalization. Local/direct deployments default to the socket address and ignore supplied IP headers. Keep the Railway setting limited to deployments reached through Railway's HTTP edge; do not expose the same process through an untrusted direct public connection.

## Persistence and availability

Use one service instance with this SQLite volume. The database schema migrates at process startup. Restarts preserve users, stock and movement history when the volume is attached. The app refreshes inventory after its own actions, and a stale purchase is still checked against the database before updating stock.

Hosting is subject to your account's plan and credit limits. Free/trial credit does not guarantee permanent hosting. No paid plan or billing change is selected by this configuration.

## Verification status

The production build and local API/browser checks are recorded in [the test report](TEST_REPORT.md). A public deployment URL will be added after a connected Railway account completes a successful deployment and its health, authentication and inventory flows are verified.

References: [Railway configuration](https://docs.railway.com/config-as-code), [volumes and their availability](https://docs.railway.com/volumes), [edge request headers](https://docs.railway.com/networking/public-networking/specs-and-limits).
