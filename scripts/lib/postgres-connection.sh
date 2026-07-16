#!/usr/bin/env bash
# Shared PostgreSQL connection resolver for production backup/restore scripts.
# This file is sourced by callers and intentionally does not change shell options.

POSTGRES_COMMAND_ENV=()
POSTGRES_DATABASE=""
POSTGRES_TARGET_DISPLAY=""

resolve_postgres_connection() {
  POSTGRES_COMMAND_ENV=()
  POSTGRES_DATABASE=""
  POSTGRES_TARGET_DISPLAY=""

  local host=""
  local port=""
  local user=""
  local pg_passphrase=""
  local database=""
  local sslmode=""
  local sslcert=""
  local sslkey=""
  local sslrootcert=""
  local sslcrl=""

  if [[ -n "${DATABASE_URL:-}" ]]; then
    command -v node >/dev/null 2>&1 || {
      echo "node is required to parse DATABASE_URL safely" >&2
      return 1
    }

    local parsed=()
    local value
    while IFS= read -r -d '' value; do
      parsed+=("$value")
    done < <(DATABASE_URL="$DATABASE_URL" node <<'NODE'
const raw = process.env.DATABASE_URL;
let url;
try {
  url = new URL(raw);
} catch {
  process.stderr.write("DATABASE_URL is not a valid URL\n");
  process.exit(2);
}

if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
  process.stderr.write("DATABASE_URL must use postgres: or postgresql:\n");
  process.exit(2);
}

const decode = (value, label) => {
  try {
    return decodeURIComponent(value || "");
  } catch {
    process.stderr.write(`DATABASE_URL contains invalid encoding in ${label}\n`);
    process.exit(2);
  }
};

const queryHost = url.searchParams.get("host");
let host = queryHost !== null ? queryHost : url.hostname;
if (host.startsWith("[") && host.endsWith("]")) {
  host = host.slice(1, -1);
}

const database = decode(url.pathname.replace(/^\//, ""), "database");
if (!database) {
  process.stderr.write("DATABASE_URL must include a database name\n");
  process.exit(2);
}

let sslmode = url.searchParams.get("sslmode") || "";
if (!sslmode && url.searchParams.get("ssl") === "true") {
  sslmode = "require";
}

const values = [
  host,
  url.port,
  decode(url.username, "username"),
  decode(url.password, "database credential"),
  database,
  sslmode,
  url.searchParams.get("sslcert") || "",
  url.searchParams.get("sslkey") || "",
  url.searchParams.get("sslrootcert") || "",
  url.searchParams.get("sslcrl") || "",
];

for (const item of values) {
  process.stdout.write(item);
  process.stdout.write("\0");
}
NODE
)

    if (( ${#parsed[@]} != 10 )); then
      echo "failed to resolve the complete PostgreSQL target from DATABASE_URL" >&2
      return 1
    fi

    host="${parsed[0]}"
    port="${parsed[1]}"
    user="${parsed[2]}"
    pg_passphrase="${parsed[3]}"
    database="${parsed[4]}"
    sslmode="${parsed[5]}"
    sslcert="${parsed[6]}"
    sslkey="${parsed[7]}"
    sslrootcert="${parsed[8]}"
    sslcrl="${parsed[9]}"
  elif [[ -n "${POSTGRES_HOST:-}" && -n "${POSTGRES_DB:-}" && -n "${POSTGRES_USER:-}" ]]; then
    host="$POSTGRES_HOST"
    port="${POSTGRES_PORT:-5432}"
    user="$POSTGRES_USER"
    pg_passphrase="${POSTGRES_PASSWORD:-}"
    database="$POSTGRES_DB"
    sslmode="${POSTGRES_SSLMODE:-${PGSSLMODE:-}}"
    sslcert="${POSTGRES_SSLCERT:-${PGSSLCERT:-}}"
    sslkey="${POSTGRES_SSLKEY:-${PGSSLKEY:-}}"
    sslrootcert="${POSTGRES_SSLROOTCERT:-${PGSSLROOTCERT:-}}"
    sslcrl="${POSTGRES_SSLCRL:-${PGSSLCRL:-}}"
  else
    echo "DATABASE_URL or POSTGRES_HOST, POSTGRES_DB, and POSTGRES_USER must be set" >&2
    return 1
  fi

  [[ -n "$database" ]] || {
    echo "PostgreSQL database name is required" >&2
    return 1
  }

  POSTGRES_DATABASE="$database"
  POSTGRES_COMMAND_ENV=("PGDATABASE=$database")
  [[ -n "$host" ]] && POSTGRES_COMMAND_ENV+=("PGHOST=$host")
  [[ -n "$port" ]] && POSTGRES_COMMAND_ENV+=("PGPORT=$port")
  [[ -n "$user" ]] && POSTGRES_COMMAND_ENV+=("PGUSER=$user")
  [[ -n "$pg_passphrase" ]] && POSTGRES_COMMAND_ENV+=("PGPASSWORD=$pg_passphrase")
  [[ -n "$sslmode" ]] && POSTGRES_COMMAND_ENV+=("PGSSLMODE=$sslmode")
  [[ -n "$sslcert" ]] && POSTGRES_COMMAND_ENV+=("PGSSLCERT=$sslcert")
  [[ -n "$sslkey" ]] && POSTGRES_COMMAND_ENV+=("PGSSLKEY=$sslkey")
  [[ -n "$sslrootcert" ]] && POSTGRES_COMMAND_ENV+=("PGSSLROOTCERT=$sslrootcert")
  [[ -n "$sslcrl" ]] && POSTGRES_COMMAND_ENV+=("PGSSLCRL=$sslcrl")

  POSTGRES_TARGET_DISPLAY="${host:-<local-default>}:${port:-5432}/$database user=${user:-<os-default>}"
}

run_postgres_command() (
  # Use shell builtins so credentials never become arguments to an intermediate
  # `env` process. The subshell keeps the caller environment unchanged.
  unset \
    PGHOST \
    PGPORT \
    PGUSER \
    PGPASSWORD \
    PGDATABASE \
    PGSSLMODE \
    PGSSLCERT \
    PGSSLKEY \
    PGSSLROOTCERT \
    PGSSLCRL \
    PGSERVICE \
    PGSERVICEFILE

  local assignment
  for assignment in "${POSTGRES_COMMAND_ENV[@]}"; do
    export "$assignment"
  done

  exec "$@"
)
