#!/bin/bash
set -e

echo "Creating pgaudit extension and enabling configuration..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pgaudit;
    ALTER SYSTEM SET pgaudit.log = 'all';
    ALTER SYSTEM SET pgaudit.log_parameter = on;
    ALTER SYSTEM SET pgaudit.role = 'postgres';
EOSQL
