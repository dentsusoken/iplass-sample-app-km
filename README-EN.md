lang: [English](./README-EN.md) | [日本語](./README.md)

# iplass-sample-app-km
A sample iPLAss application (knowledge management).

For an overview of the sample application, refer to the following document.

<https://iplass.org/docs/sample/km/>

## Related repositories

* <https://github.com/dentsusoken/iPLAss>

## Setting Up the Environment

### Prerequisite Tools

| Tool | Purpose | Installation |
|---|---|---|
| **JDK 21** | Gradle builds and running Tomcat | [Amazon Corretto](https://aws.amazon.com/corretto/) or similar. Be sure to set `JAVA_HOME` |
| **mise** | Version management for Tomcat and Node.js, and running various tasks | https://mise.jdx.dev/getting-started.html |

### Environment Variables

Set the following environment variables in your OS.

| Variable | Purpose |
|---|---|
| `JAVA_HOME` | Path to the JDK. Required for builds and running Tomcat |
| `CATALINA_HOME` | Referenced by Gradle's Tomcat tasks. When running via mise tasks (e.g. `mise run deploy`), this is resolved automatically, so manual configuration is not needed |

### Authentication Settings

#### npm registry (retrieving iPLAss packages)

Set the authentication token for the iPLAss Nexus private registry in `~/.npmrc`.
The project's `.npmrc` contains only the registry URL, not the token.

#### Maven repository (retrieving iPLAss Java libraries)

Make sure the following are set in `gradle.properties`:
- `iPLAssMavenRepoUsername`
- `iPLAssMavenRepoPassword`

### Configuration Files (create your own)

The following files are not included in the repository and must be created in each environment.

#### `e2e-integration/e2e.config.json`

Create it using the template `e2e-integration/e2e.config.template.json` as a reference:
```json
{
  "port": 8900,
  "contextPath": "<rootProject.name in settings.gradle>",
  "tenantName": "<iPLAss tenant name>",
  "spaPath": "<Action path of the SPA page>"
}
```

### Database Connection Settings

Configure the `ConnectionFactory` section of `src/main/resources/mtp-service-config.xml` for your environment:
- `inherits` — the config matching the database you use (Oracle / PostgreSQL / MySQL / SQL Server)
- `url` / `user` / `password` / `driver`

The default configuration targets Oracle.

#### (Oracle only) Placing the JDBC Driver

If you use Oracle Database, place the Oracle JDBC driver in `lib/jdbc/`.
The deploy task copies it from here to Tomcat's `lib/`.
**Note**: Do not mix in unnecessary drivers (this can cause class-loading conflicts).

### Setting Up the Environment

First, run `mise trust && mise install` in the root folder of this sample application.
This command installs the Node.js and Tomcat used for development and testing.

Next, run `mise run setup` in the same folder to install the remaining dependencies.

### Creating an iPLAss Tenant

Run `mise run tenant` to create a tenant.
Note: `mise run tenant` internally runs `./gradlew runTenantBatch`.

### Deploying and Verifying Startup

Verify that you can deploy and start the sample application using one of the following methods.

- Deploy and start from an IDE such as Eclipse
- Deploy and start with the `mise run deploy` command (it starts on port 8900)

### Importing Metadata and Sample Data

Deploy and start iPLAss, then import this sample application's metadata and sample data in order from the Admin Console.

1. **Metadata**: In the Admin Console's **MetaData Explorer**, import [`meta-data/metadata.xml`](meta-data/metadata.xml).
2. **Sample data**: In the Admin Console's **Packaging**, import [`sample-data/entitydata.zip`](sample-data/entitydata.zip).

### Creating Test Users

Running the JUnit and integration tests provided with this sample requires the following two users.
Log in to iPLAss as an administrator and create the users.

1. Inquiry user
  - Account ID: `testuser`
  - Password: `testuser`
  - Group: `inquiry_user`

2. Inquiry user
  - Account ID: `testresponder`
  - Password: `testresponder`
  - Group: `inquiry_responder`

## Development Commands

mise tasks are defined for development.
These tasks internally use npm (frontend) and gradle (Java and Tomcat).

> **Prerequisite**: mise tasks run in bash. On Windows, a bash environment such as Git Bash is required.
> The target is the test Tomcat managed by mise (defined in `.mise.toml`), which is independent of the development server you start from an IDE such as Eclipse. To avoid port conflicts, do not use a port number in `e2e-integration/e2e.config.json` that overlaps with another server.

### 1. Initial Setup

After completing the authentication, configuration files, and DB connection described in "Setting Up the Environment":

```bash
mise trust && mise install   # Install Node.js and Tomcat
mise run setup               # Install npm dependencies and Playwright browsers
mise run tenant              # Create an iPLAss tenant
```

### 2. Frontend Development (hot reload)

```bash
npm run dev                  # Vite dev server (port 3000, proxies to the iPLAss backend)
```

### 3. Formatting, Static Analysis, and Unit Tests (before committing)

```bash
mise run fmt                 # Format Java (Spotless) and frontend (Prettier)
mise run lint                # Auto-fix with ESLint
mise run test                # Frontend unit tests (Vitest)
mise run test:java           # Backend unit tests (JUnit)
mise run test:mock           # Mock UI tests (Playwright, no server required)
mise run check               # Run all of the above checks at once (CI gate, no server required)
```

### 4. Verifying on a Real Server

```bash
mise run build:frontend      # Build only the frontend (SPA) → src/main/webapp/km/assets/
mise run build:java          # Build only the Java (WAR) → build/libs/
mise run deploy              # Build frontend + WAR → deploy → start Tomcat
mise run tomcat-stop         # Stop
mise run tomcat-restart      # Restart (to apply configuration changes made in the Admin Console)
```

### 5. Integration Tests (real server)

```bash
mise run e2e-full            # Run deploy → health → test → stop at once (from a clean state)
mise run e2e                 # Tests only (assumes the server is already running)
```

You can pass Playwright options to `mise run e2e` via `--`:

```bash
mise run e2e -- -g "should create"   # Filter by test name
mise run e2e -- --headed             # Show the browser
mise run e2e -- --trace on           # Always record traces (view them in playwright-report-integration/)
```

### 6. Operations Tools

```bash
mise run crawl               # Update the full-text search (Lucene) index (run mise run tomcat-restart to apply)
mise run config-view         # Show the merged service-config
mise run entity-class        # Generate Entity Java mapping classes (interactive)
```

### Troubleshooting

```bash
mise run logs                # Extract errors from app.log (filter with mise run logs -- <keyword>)
mise run tomcat-debug        # Start Tomcat with JPDA debugging (port 5005)
mise run e2e-debug           # Step through with the Playwright Inspector (requires a running server)
mise run e2e-ui              # Playwright UI mode (test selection, traces, time travel)
```

To debug the server side, attach your editor remotely to the Tomcat started with `mise run tomcat-debug` (use Remote JVM Debug on port 5005 in IntelliJ / Eclipse; for VS Code, use `{ "type": "java", "request": "attach", "hostName": "localhost", "port": 5005 }`). To debug the frontend and the server at the same time, run `mise run tomcat-debug` together with `mise run e2e-debug`.


## License
[AGPL-3.0](https://www.gnu.org/licenses/agpl.html)
