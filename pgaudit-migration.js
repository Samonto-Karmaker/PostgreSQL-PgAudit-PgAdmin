const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Default configuration
const defaultConfig = {
    user: "postgres",
    database: "postgres",
    password: "postgres",
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2)
    const config = { ...defaultConfig }

    // Display help if requested
    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
PostgreSQL pgAudit Migration Tool

Usage: 
  node pgaudit-migration.js --container CONTAINER_NAME [options]

Required:
  --container, -c    Name of the PostgreSQL container (required)

Options:
  --user, -u         PostgreSQL username (default: postgres)
  --database, -d     PostgreSQL database name (default: postgres)
  --password, -p     PostgreSQL password (default: postgres)
  --help, -h         Show this help message
        `)
        process.exit(0)
    }

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const nextArg = args[i + 1]

        if (arg === "--container" || arg === "-c") {
            config.container = nextArg
            i++
        } else if (arg === "--user" || arg === "-u") {
            config.user = nextArg
            i++
        } else if (arg === "--database" || arg === "-d") {
            config.database = nextArg
            i++
        } else if (arg === "--password" || arg === "-p") {
            config.password = nextArg
            i++
        }
    }

    // Validate container name is provided
    if (!config.container) {
        console.error("❌ Error: Container name is required.")
        console.error(
            "Please provide a container name using the --container or -c flag."
        )
        console.error(
            "Example: node pgaudit-migration.js --container my-postgres-container"
        )
        console.error("Run with --help for more information.")
        process.exit(1)
    }

    return config
}

// Get configuration from arguments
const config = parseArgs()

const logDir = "logs"
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

const logFilePath = path.join(logDir, `pgaudit-setup.${timestamp()}.log`)
fs.writeFileSync(logFilePath, "===== pgAudit Setup Log =====\n\n")

function logToFile(message) {
    fs.appendFileSync(logFilePath, message + "\n")
}

function runCommand(cmd) {
    console.log(`🛠️ Running: ${cmd}`)
    logToFile(`🛠️ Running: ${cmd}`)
    try {
        const output = execSync(cmd, { stdio: "pipe" }).toString()
        logToFile(output)
    } catch (err) {
        logToFile("❌ Error running command:")
        logToFile(err.stdout?.toString() || "")
        logToFile(err.stderr?.toString() || err.message)
        console.error("❌ Error running command (also logged to file).")
        process.exit(1)
    }
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16)
}

console.log("===== 🐘 pgAudit Migration Tool =====")

console.log("🔧 Configuration:")
console.log(`   Container: ${config.container}`)
console.log(`   User: ${config.user}`)
console.log(`   Database: ${config.database}`)
console.log(`   Password: ${config.password.replace(/./g, "*")}`)
console.log("")

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
