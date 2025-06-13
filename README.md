# PostgreSQL with pgAudit Extension and pgAdmin4

This project provides a Docker-based development environment for PostgreSQL with auditing capabilities using the pgAudit extension. It includes pgAdmin4 for database management through a web interface.

## Overview

This setup creates a PostgreSQL 17 database with pgAudit configured for comprehensive SQL audit logging, alongside pgAdmin4 for easy database management. It's designed for:

- Database auditing and monitoring
- Compliance requirements tracking
- Security enhancement through SQL activity logging
- Development and testing with audit capabilities

## Features

- **PostgreSQL 17**: Latest version with improved performance and features
- **pgAudit Extension**: Detailed SQL audit logging including:
  - Session logging of database changes
  - Object logging of relations referenced in SQL statements
  - Statement logging based on statement classes
  - Parameter logging of all parameters
- **pgAdmin4**: Web-based administration and development platform
- **Docker Compose**: Easy setup and tear down for development environments
- **Customizable Configuration**: Modifiable PostgreSQL and pgAudit settings

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of PostgreSQL and Docker

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

- **PostgreSQL**: Available at `localhost:5440`
- **pgAdmin4**: Available at `http://localhost:5050`

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
```

## pgAudit Configuration

The default configuration logs all SQL activity for the `postgres` user. This can be customized by modifying `db/custom-postgresql.conf` and `db/configure-pgaudit.sh`.

Key pgAudit settings:
- `pgaudit.log = 'all'`: Logs all statement classes
- `pgaudit.log_parameter = on`: Logs parameters passed with statements
- `pgaudit.role = 'postgres'`: Logs activity for the postgres role

## Customization

### Changing PostgreSQL Configuration

Edit `db/custom-postgresql.conf` to modify PostgreSQL settings.

### Modifying pgAudit Settings

Edit `db/configure-pgaudit.sh` to change pgAudit settings:

```bash
# Example: Change to only log write operations
ALTER SYSTEM SET pgaudit.log = 'write';
```

### Port Changes

If you need to modify the port mappings, edit the `ports` sections in `docker-compose.yaml`.

## Development Use

When using this setup for development:

1. Create a database and required schemas/tables
2. Run your application with the PostgreSQL connection string:
   ```
   postgresql://postgres:your_password@localhost:5440/main
   ```
3. Verify audit logging is capturing the expected SQL operations
4. Check logs to ensure compliance with your requirements

## Troubleshooting

### Common Issues

1. **Connection refused errors**:
   - Ensure the containers are running: `docker ps`
   - Check the logs: `docker logs postgres-audit`

2. **pgAudit not capturing logs**:
   - Verify pgAudit is enabled: `SHOW shared_preload_libraries;`
   - Check pgAudit settings: `SHOW pgaudit.log;`

3. **Container startup failures**:
   - Remove the volume and try again: `docker compose down -v && docker compose up -d`

## Additional Resources

- [pgAudit Documentation](https://github.com/pgaudit/pgaudit)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
