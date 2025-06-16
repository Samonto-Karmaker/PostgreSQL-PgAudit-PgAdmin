# Start from the official PostgreSQL 17 image
FROM postgres:17

# Install required packages for building pgaudit
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    # For cloning the pgaudit repo
    git \
    # For building C extensions
    build-essential \
    # PostgreSQL server development files
    postgresql-server-dev-17 \
    # SSL certificates
    ca-certificates \
    # PostgreSQL client library development files
    libpq-dev \
    # For building pgaudit
    libkrb5-dev \
    # Clean up apt cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Clone the pgaudit source code and build/install it
WORKDIR /tmp
RUN git clone https://github.com/pgaudit/pgaudit.git && \
    cd pgaudit && \
    # Use the branch/tag for PostgreSQL 17
    git checkout REL_17_STABLE && \
    # Build the extension
    make USE_PGXS=1 && \
    # Install the extension
    make install USE_PGXS=1 && \
    # Clean up build files
    cd / && rm -rf /tmp/pgaudit

# Copy custom PostgreSQL configuration
COPY custom-postgresql.conf /etc/postgresql/postgresql.conf

# Copy initialization script to docker-entrypoint-initdb.d/
# Scripts in this directory run during database initialization
COPY configure-pgaudit.sh /docker-entrypoint-initdb.d/

# Make the script executable
RUN chmod +x /docker-entrypoint-initdb.d/configure-pgaudit.sh

# The default entrypoint and CMD from the postgres image will be used