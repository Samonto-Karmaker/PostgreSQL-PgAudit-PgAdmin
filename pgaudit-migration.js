const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const config = {
    container: "postgres-audit-test",
    user: "postgres",
    database: "postgres",
    password: "postgres",
}

function runCommand(cmd) {
    console.log(`🛠️ Running: ${cmd}`)
    try {
        execSync(cmd, { stdio: "inherit" })
    } catch (err) {
        console.error("❌ Error running command:")
        console.error(err.message || err)
        process.exit(1)
    }
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16)
}

console.log("===== 🐘 pgAudit Migration Tool =====")

console.log("🔧 Target container:", config.container)

// Check container is running
runCommand(
    `docker ps --filter "name=${config.container}" --format "{{.Names}}"`
)

// Backup postgresql.conf
console.log("📦 Backing up postgresql.conf...")
runCommand(
    `docker exec ${config.container} bash -c "cp \\\"\\$PGDATA/postgresql.conf\\\" \\\"\\$PGDATA/postgresql.conf.bak\\\""`
)

const backupDir = "backups"
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)

const backupPath = path.join(backupDir, `postgresql.conf.${timestamp()}`)
runCommand(
    `docker cp ${config.container}:/var/lib/postgresql/data/postgresql.conf ${backupPath}`
)

// Install build dependencies
console.log("📥 Installing build dependencies...")
runCommand(
    `docker exec ${config.container} bash -c "apt-get update && apt-get install -y git build-essential postgresql-server-dev-17 ca-certificates libpq-dev libkrb5-dev"`
)

// Clone and build pgAudit
console.log("🔧 Cloning & building pgAudit...")
runCommand(`docker exec ${config.container} bash -c "
    cd /tmp && \
    git clone https://github.com/pgaudit/pgaudit.git && \
    cd pgaudit && \
    git checkout REL_17_STABLE && \
    make USE_PGXS=1 && make install USE_PGXS=1 && \
    cd / && rm -rf /tmp/pgaudit
"`)

// Copy and apply custom config
console.log("⚙️ Applying custom configuration...")
runCommand(
    `docker cp ./db/custom-postgresql.conf ${config.container}:/etc/postgresql/custom-postgresql.conf`
)
runCommand(
    `docker exec ${config.container} bash -c "cp /etc/postgresql/custom-postgresql.conf \\\"\\$PGDATA/postgresql.conf\\\""`
)

// Restart PostgreSQL container
console.log("🔁 Restarting PostgreSQL container...")
runCommand(`docker restart ${config.container}`)
console.log("⏳ Waiting 5 seconds for PostgreSQL to come up...")
execSync("sleep 5")

// Create pgAudit extension and configure
console.log("🔌 Creating pgAudit extension...")
const psqlCmd = (cmd) =>
    `docker exec -e PGPASSWORD="${config.password}" ${config.container} bash -c "psql -U ${config.user} -d ${config.database} -c \\"${cmd}\\""`

// Create extension and set parameters
runCommand(psqlCmd("CREATE EXTENSION IF NOT EXISTS pgaudit;"))
runCommand(psqlCmd("ALTER SYSTEM SET pgaudit.log = 'all';"))
runCommand(psqlCmd("ALTER SYSTEM SET pgaudit.log_parameter = on;"))
runCommand(psqlCmd("ALTER SYSTEM SET pgaudit.role = 'postgres';"))
runCommand(psqlCmd("SELECT pg_reload_conf();"))

// Verify
console.log("🔍 Verifying pgAudit installation...")
runCommand(
    psqlCmd("SELECT name, setting FROM pg_settings WHERE name LIKE 'pgaudit%';")
)

console.log("✅ pgAudit installed and configured successfully!\n")

console.log(
    "🎉 Setup complete! You can now test logging by running SQL queries and checking logs.\n"
)

console.log("🔄 To rollback config:")
console.log(
    `docker exec ${config.container} bash -c 'cp $PGDATA/postgresql.conf.bak $PGDATA/postgresql.conf'`
)
console.log(`docker restart ${config.container}`)
