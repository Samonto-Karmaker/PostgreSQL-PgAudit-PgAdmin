# PostgreSQL with pgAudit Extension and pgAdmin4

This project provides a Docker-based environment for PostgreSQL with comprehensive SQL auditing capabilities using the pgAudit extension. It includes pgAdmin4 for database management through a web interface, making it ideal for both development and production use cases.

## Overview

This setup creates a PostgreSQL 17 database with pgAudit configured for detailed SQL audit logging, alongside pgAdmin4 for easy database management. It's designed for:

-   Database auditing and monitoring
-   Compliance requirements tracking (GDPR, HIPAA, SOX, etc.)
-   Security enhancement through SQL activity logging
-   Forensic analysis of database operations
-   Development and testing with audit capabilities

## Features

-   **PostgreSQL 17**: Latest version with improved performance and features
-   **pgAudit Extension**: Detailed SQL audit logging including:
    -   Session logging of database changes
    -   Object logging of relations referenced in SQL statements
    -   Statement logging based on statement classes
    -   Parameter logging of all parameters
    -   Role-based audit filtering
-   **pgAdmin4**: Web-based administration and development platform
-   **Docker Compose**: Easy setup and tear down for development environments
-   **Customizable Configuration**: Modifiable PostgreSQL and pgAudit settings
-   **Migration Tool**: JavaScript-based tool for adding pgAudit to existing PostgreSQL deployments
-   **Volume Management**: Persistent storage for database files and dedicated log volume
-   **Environment-Based Configuration**: Customize settings via environment variables

## Prerequisites

-   Docker and Docker Compose installed
-   Basic understanding of PostgreSQL and Docker

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Samonto-Karmaker/PostgreSQL-PgAudit-PgAdmin.git
cd PostgreSQL-PgAudit-PgAdmin
```

### 2. Configure environment variables

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to set your preferred credentials:

```properties
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=main

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=your_secure_password
```

### 3. Start the containers

```bash
docker compose up -d
```

### 4. Access the services

-   **PostgreSQL**: Available at `localhost:5440`
-   **pgAdmin4**: Available at `http://localhost:5050`

## Connecting to the Database

### Using pgAdmin4 (Web Interface)

1. Navigate to `http://localhost:5050` in your browser
2. Login with the email and password specified in your `.env` file
3. Add a new server with the following details:
    - **Name**: Any name of your choice
    - **Host**: `postgres` (when connecting from pgAdmin container) or `localhost` (when connecting from host)
    - **Port**: `5432` (when connecting from pgAdmin container) or `5440` (when connecting from host)
    - **Username**: Value of `POSTGRES_USER` from your `.env` file
    - **Password**: Value of `POSTGRES_PASSWORD` from your `.env` file

### Using Command Line

```bash
# Connect from your host machine
psql -h localhost -p 5440 -U postgres -d main

# OR connect from within the container
docker exec -it postgres-audit psql -U postgres -d main
```

## Viewing Audit Logs

Audit logs are written to the `logs` directory on your host machine. Files are named with the format `postgresql-YYYY-MM-DD_HHMMSS.log`.

Example log entries will look like:

```
2025-06-13 09:01:41.632 GMT [65] postgres@main AUDIT: STATEMENT: CREATE TABLE test(id serial primary key, data text);
2025-06-13 09:01:52.104 GMT [65] postgres@main AUDIT: STATEMENT: INSERT INTO test(data) VALUES ('sample data');
2025-06-13 09:02:03.247 GMT [65] postgres@main AUDIT: STATEMENT: SELECT * FROM test WHERE id = 1;
```

You can view logs directly from your host machine or access them from inside the container:

```bash
# View logs from host machine
cat logs/postgresql-*.log | grep "AUDIT:"

# View logs from inside container
docker exec postgres-audit tail -n 50 /var/log/postgresql/postgresql-*.log
```

## pgAudit Configuration

The default configuration logs all SQL activity for the `postgres` user. This can be customized by modifying `db/custom-postgresql.conf` and `db/configure-pgaudit.sh`.

### Key pgAudit Settings

| Setting                 | Default Value | Description                                                      |
| ----------------------- | ------------- | ---------------------------------------------------------------- |
| `pgaudit.log`           | `'all'`       | Logs all statement classes (READ, WRITE, FUNCTION, etc.)         |
| `pgaudit.log_parameter` | `on`          | Logs parameters passed with statements                           |
| `pgaudit.role`          | `'postgres'`  | Logs activity for the postgres role                              |
| `pgaudit.log_catalog`   | Not set       | When enabled, logs catalog objects                               |
| `pgaudit.log_relation`  | Not set       | Logs each relation (table, view, etc.) referenced in a statement |

These settings can be modified in `db/configure-pgaudit.sh` or via SQL after installation:

```sql
ALTER SYSTEM SET pgaudit.log = 'write,ddl';  -- Only log write and DDL operations
SELECT pg_reload_conf();  -- Reload configuration
```

## Customization

### Changing PostgreSQL Configuration

Edit `db/custom-postgresql.conf` to modify PostgreSQL settings. After editing, rebuild and restart the containers:

```bash
docker-compose down
docker-compose build postgres
docker-compose up -d
```

### Modifying pgAudit Settings

You can modify pgAudit settings in two ways:

1. **Edit `db/configure-pgaudit.sh`** to change settings during initialization:

```bash
# Example: Change to only log write operations
ALTER SYSTEM SET pgaudit.log = 'write';
```

2. **Live configuration** using SQL (applies immediately):

```bash
# Connect to the database
docker exec -it postgres-audit psql -U postgres -d main

# Modify settings
ALTER SYSTEM SET pgaudit.log = 'write,ddl';
ALTER SYSTEM SET pgaudit.log_parameter = off;
SELECT pg_reload_conf();
```

### Port Changes

If you need to modify the port mappings, edit the `ports` sections in `docker-compose.yaml`:

```yaml
ports:
    - "5440:5432" # Change 5440 to your desired host port
```

### Environment Variable Customization

All sensitive configuration is handled through environment variables defined in the `.env` file. You can modify these without changing the docker-compose.yaml file.

## Development Use

When using this setup for development:

1. Create a database and required schemas/tables
2. Run your application with the PostgreSQL connection string:
    ```
    postgresql://postgres:your_password@localhost:5440/main
    ```
3. Verify audit logging is capturing the expected SQL operations
4. Check logs to ensure compliance with your requirements

### Sample Audit Tests

To test pgAudit logging, you can run these sample queries:

```sql
-- Create a test table
CREATE TABLE audit_test (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data (should generate audit logs)
INSERT INTO audit_test (data) VALUES ('Test record 1');
INSERT INTO audit_test (data) VALUES ('Test record 2');

-- Query data (optionally logged depending on pgaudit.log setting)
SELECT * FROM audit_test;

-- Update data (should generate audit logs)
UPDATE audit_test SET data = 'Modified data' WHERE id = 1;

-- Delete data (should generate audit logs)
DELETE FROM audit_test WHERE id = 2;
```

Then check the logs to verify these operations were recorded.

## Migrating Existing PostgreSQL Deployments

For existing PostgreSQL 17 deployments, use the included migration script to add pgAudit capabilities:

```bash
# Install Node.js dependencies if needed
npm install

# Run the migration script on an existing PostgreSQL container
node pgaudit-migration.js
```

You can customize the migration by editing the configuration at the top of the script:

```javascript
const config = {
    container: "your-postgres-container", // Target container name
    user: "postgres", // PostgreSQL username
    database: "your_database", // Target database
    password: "your_password", // PostgreSQL password
}
```

The script will:

1. Back up your existing PostgreSQL configuration
2. Install pgAudit and its dependencies
3. Configure pgAudit with the recommended settings
4. Restart PostgreSQL to apply changes

If you need to roll back, the script provides instructions for restoring your original configuration.

## Troubleshooting

### Common Issues

1. **Connection refused errors**:

    - Ensure the containers are running: `docker ps`
    - Check the logs: `docker logs postgres-audit`
    - Verify that your host machine's port 5440 isn't being used by another service
    - Ensure pgAdmin container can reach postgres container using the service name

2. **pgAudit not capturing logs**:

    - Verify pgAudit is enabled: `SHOW shared_preload_libraries;`
    - Check pgAudit settings: `SHOW pgaudit.log;`
    - Confirm your operations match the audit logging level (e.g., READ, WRITE, etc.)
    - Check log directory permissions in the host system

3. **Container startup failures**:

    - Remove the volume and try again: `docker compose down -v && docker compose up -d`
    - Check for port conflicts with other applications
    - Verify Docker has sufficient resources

4. **pgAdmin connection issues**:
    - When connecting from pgAdmin container, use `postgres` as hostname and `5432` as port
    - When connecting from host machine, use `localhost` as hostname and `5440` as port

## Security Considerations

-   Change default passwords in the `.env` file
-   Consider implementing network isolation in production
-   Regularly rotate audit logs
-   Consider encrypted volumes for sensitive environments
-   Implement proper access controls for log files

## Additional Resources

-   [pgAudit Documentation](https://github.com/pgaudit/pgaudit)
-   [PostgreSQL Documentation](https://www.postgresql.org/docs/)
-   [pgAdmin Documentation](https://www.pgadmin.org/docs/)
-   [Docker Compose Documentation](https://docs.docker.com/compose/)
-   [SQL Audit Logging Best Practices](https://www.postgresql.org/docs/current/monitoring.html)

## License

This project is available under the MIT license. See LICENSE file for more information.

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues to improve the project.
