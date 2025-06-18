# PostgreSQL with pgAudit Extension and pgAdmin4

This project provides a Docker-based environment for PostgreSQL with comprehensive SQL auditing capabilities using the pgAudit extension. It includes pgAdmin4 for database management through a web interface, making it ideal for both development and production use cases.

## Overview

This solution creates a PostgreSQL 17 database with pgAudit for comprehensive SQL audit logging and pgAdmin4 for database management.

### Key Features

-   **PostgreSQL 17** with **pgAudit Extension** providing:
    -   SQL activity logging for compliance (GDPR, HIPAA, SOX)
    -   Session/object logging with parameter capture
    -   Role-based filtering
-   **Web Management** via pgAdmin4
-   **Easy Setup** with Docker Compose
-   **Migration Tool** for existing PostgreSQL deployments
-   **Customizable Configuration** via environment variables

## Prerequisites

-   Docker and Docker Compose installed
-   Basic understanding of PostgreSQL and Docker

## Quick Setup

1. **Clone & Configure**

```bash
git clone https://github.com/Samonto-Karmaker/PostgreSQL-PgAudit-PgAdmin.git
cd PostgreSQL-PgAudit-PgAdmin
cp .env.example .env  # Edit with your credentials
```

2. **Start Services & Connect**

```bash
docker compose up -d
```

-   **PostgreSQL**: Available at `localhost:5440`
-   **pgAdmin4**: Available at `http://localhost:5050` (login with credentials from .env)

3. **Connect via pgAdmin**

    - Host: `postgres` (from pgAdmin) or `localhost` (from host)
    - Port: `5432` (from pgAdmin) or `5440` (from host)
    - User/Password: Values from .env

4. **Or Connect via CLI**

```bash
psql -h localhost -p 5440 -U postgres -d main
# OR
docker exec -it postgres-audit psql -U postgres -d main
```

## Audit Logging

Logs are saved to the `logs` directory with the format `postgresql-YYYY-MM-DD_HHMMSS.log`.

**Sample log entries:**

```
2025-06-13 09:01:41.632 GMT [65] postgres@main AUDIT: STATEMENT: CREATE TABLE test(id serial primary key, data text);
```

**View logs:**

```bash
cat logs/postgresql-*.log | grep "AUDIT:"
```

The migration script also generates its own logs in the same directory for troubleshooting.

## Configuration & Customization

### pgAudit Settings

| Setting                 | Default      | Description                                  |
| ----------------------- | ------------ | -------------------------------------------- |
| `pgaudit.log`           | `'all'`      | Statement classes to log (READ, WRITE, etc.) |
| `pgaudit.log_parameter` | `on`         | Log parameters passed with statements        |
| `pgaudit.role`          | `'postgres'` | Log activity for this role                   |

**Modify settings:**

```sql
-- Live configuration
ALTER SYSTEM SET pgaudit.log = 'write,ddl';
SELECT pg_reload_conf();
```

### Quick Customization Options

1. **PostgreSQL settings**: Edit `db/custom-postgresql.conf` and restart
2. **Port changes**: Modify port mappings in `docker-compose.yaml`
3. **Credentials**: Update values in `.env` file

## Development Use

Connect your application to `postgresql://postgres:your_password@localhost:5440/main` and verify audit logs capture the required operations.

### Testing Audit Logging

Run these sample queries to verify audit logging:

```sql
-- Create a test table and perform operations
CREATE TABLE audit_test (id SERIAL PRIMARY KEY, data TEXT);
INSERT INTO audit_test (data) VALUES ('Test record 1');
UPDATE audit_test SET data = 'Modified data' WHERE id = 1;
DELETE FROM audit_test WHERE id = 1;
```

Then check the logs to verify these operations were recorded.

## Migrating Existing PostgreSQL Deployments

For existing PostgreSQL 17 deployments, use the included migration script:

```bash
node pgaudit-migration.js --container your-postgres-container
```

The script accepts these command line arguments:

```
Required:
  --container, -c    Name of the PostgreSQL container (required)

Options:
  --user, -u         PostgreSQL username (default: postgres)
  --database, -d     PostgreSQL database name (default: postgres)
  --password, -p     PostgreSQL password (default: postgres)
  --help, -h         Show help information
```

Example with all options:

```bash
node pgaudit-migration.js --container postgres-container --user admin --database mydb --password mysecretpw
```

### Accessing Audit Logs in Existing Projects

**Important:** If you're using the migration script with an existing project and want to see audit logs in your host directory, you need to modify your `docker-compose.yaml` file to add a volume mount:

```yaml
services:
    your-postgres-container:
        # ... existing configuration ...
        volumes:
            # ... existing volumes ...
            - ./logs:/var/log/postgresql # Add this line to access logs in host directory
```

Then restart your container:

```bash
docker-compose down
docker-compose up -d
```

This is the standard Docker approach for accessing container files from the host system and the most reliable way to access audit logs in your project directory.

The migration script will:

1. Back up your existing PostgreSQL configuration
2. Install pgAudit and its dependencies
3. Configure pgAudit with recommended settings
4. Restart PostgreSQL and verify the installation

Roll back instructions are provided at the end of the script execution.

## Troubleshooting & Security

### Common Issues

-   **Connection problems**:

    -   Check containers: `docker ps`
    -   Verify logs: `docker logs postgres-audit`
    -   Ensure no port conflicts on 5440/5050
    -   For pgAdmin connections, use correct host/port combinations

-   **Audit logging issues**:

    -   Verify extension: `SHOW shared_preload_libraries;`
    -   Check settings: `SHOW pgaudit.log;`
    -   Review log file permissions

-   **Container issues**: Try `docker compose down -v && docker compose up -d`

### Security Best Practices

-   Use strong passwords in `.env`
-   Implement network isolation in production
-   Rotate logs regularly
-   Set proper log file permissions

## Resources & Contributing

-   [pgAudit](https://github.com/pgaudit/pgaudit) | [PostgreSQL](https://www.postgresql.org/docs/) | [pgAdmin](https://www.pgadmin.org/docs/)

This project is available under the MIT license. Contributions welcome via pull requests or issues.
