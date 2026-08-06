#!/usr/bin/env bash
# NeoStore installer — menu: install / update / uninstall / status / restart / logs / domain
# One-liner:
#   bash <(curl -fsSL https://raw.githubusercontent.com/neoauroraproject/neostore/master/install/neostore.sh)
set -euo pipefail

REPO_URL="${NEOSTORE_REPO:-https://github.com/neoauroraproject/neostore.git}"
REPO_BRANCH="${NEOSTORE_BRANCH:-master}"
INSTALL_DIR="${NEOSTORE_HOME:-/opt/neostore}"
COMPOSE_FILE="docker-compose.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}WARN:${NC} $*"; }
err()  { echo -e "${RED}ERR:${NC} $*" >&2; }
die()  { err "$*"; exit 1; }

need_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "Run as root: sudo bash $0"
  fi
}

have() { command -v "$1" >/dev/null 2>&1; }

ensure_docker() {
  if ! have docker; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker 2>/dev/null || true
  fi
  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose plugin is required"
  fi
}

ensure_git() {
  if ! have git; then
    if have apt-get; then
      apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates
    elif have yum; then
      yum install -y git curl ca-certificates
    else
      die "git is required"
    fi
  fi
}

rand_hex() {
  if have openssl; then
    openssl rand -hex "${1:-24}"
  else
    head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c "$(( ${1:-24} * 2 ))"
  fi
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g; s/-+/-/g' | cut -c1-40
}

prompt() {
  local label="$1"
  local def="${2:-}"
  if [[ -n "$def" ]]; then
    read -r -p "$(echo -e "${CYAN}${label}${NC} [${def}]: ")" REPLY || true
    REPLY="${REPLY:-$def}"
  else
    read -r -p "$(echo -e "${CYAN}${label}${NC}: ")" REPLY || true
  fi
}

prompt_secret() {
  local label="$1"
  local val=""
  local conf=""
  while true; do
    read -r -s -p "$(echo -e "${CYAN}${label}${NC}: ")" val
    echo
    [[ -n "$val" ]] || { warn "Password cannot be empty"; continue; }
    [[ ${#val} -ge 8 ]] || { warn "Use at least 8 characters"; continue; }
    read -r -s -p "$(echo -e "${CYAN}Confirm password${NC}: ")" conf
    echo
    [[ "$val" == "$conf" ]] && break
    warn "Passwords do not match"
  done
  REPLY="$val"
}

compose() {
  (cd "$INSTALL_DIR" && docker compose -f "$COMPOSE_FILE" "$@")
}

is_installed() {
  [[ -f "$INSTALL_DIR/$COMPOSE_FILE" && -f "$INSTALL_DIR/.env" ]]
}

bootstrap_repo() {
  ensure_git
  if [[ -f "$INSTALL_DIR/$COMPOSE_FILE" ]]; then
    log "Using existing install at $INSTALL_DIR"
    return
  fi
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || true)"
  if [[ -n "$here" && -f "$here/docker-compose.yml" && -f "$here/SPEC.md" ]]; then
    if [[ "$here" != "$INSTALL_DIR" ]]; then
      log "Copying repo $here -> $INSTALL_DIR"
      mkdir -p "$INSTALL_DIR"
      # Prefer rsync if available; else tar
      if have rsync; then
        rsync -a --exclude node_modules --exclude .git/objects "$here"/ "$INSTALL_DIR"/
        # Keep .git for updates when possible
        if [[ -d "$here/.git" && ! -d "$INSTALL_DIR/.git" ]]; then
          cp -a "$here/.git" "$INSTALL_DIR/.git"
        fi
      else
        mkdir -p "$INSTALL_DIR"
        tar -C "$here" --exclude=node_modules -cf - . | tar -C "$INSTALL_DIR" -xf -
      fi
    fi
    return
  fi
  log "Cloning NeoStore into $INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$REPO_BRANCH"
    git -C "$INSTALL_DIR" checkout -B "$REPO_BRANCH" "origin/$REPO_BRANCH"
  else
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
}

# Quote a value for .env so `source` and docker compose both accept spaces/special chars
env_quote() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//\$/\\\$}"
  s="${s//\`/\\\`}"
  printf '"%s"' "$s"
}

write_env() {
  local domain="$1"
  local scheme="$2"
  local admin_email="$3"
  local admin_password="$4"
  local admin_name="$5"
  local store_name="$6"
  local store_slug="$7"
  local jwt pgpass
  jwt="$(rand_hex 32)"
  pgpass="$(rand_hex 16)"
  local base_url
  if [[ -n "$domain" ]]; then
    base_url="${scheme}://${domain}"
  else
    base_url="http://localhost"
  fi

  cat >"$INSTALL_DIR/.env" <<EOF
NODE_ENV=production
PORT=4100
POSTGRES_USER=neostore
POSTGRES_PASSWORD=$(env_quote "$pgpass")
POSTGRES_DB=neostore
DATABASE_URL=$(env_quote "postgresql://neostore:${pgpass}@postgres:5432/neostore")
REDIS_URL=redis://redis:6379
JWT_SECRET=$(env_quote "$jwt")
PUBLIC_BASE_URL=$(env_quote "$base_url")
TELEGRAM_WEBHOOK_BASE_URL=$(env_quote "$base_url")
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/data/storage
DOMAIN=$(env_quote "$domain")
TLS_SCHEME=$(env_quote "$scheme")
ADMIN_EMAIL=$(env_quote "$admin_email")
ADMIN_PASSWORD=$(env_quote "$admin_password")
ADMIN_NAME=$(env_quote "$admin_name")
STORE_NAME=$(env_quote "$store_name")
STORE_SLUG=$(env_quote "$store_slug")
NEOSTORE_VERSION=latest
NEOSTORE_PULL_POLICY=always
EOF
  chmod 600 "$INSTALL_DIR/.env"
}

write_caddyfile() {
  local domain="$1"
  local scheme="$2"
  mkdir -p "$INSTALL_DIR/install"
  local site_block
  if [[ -n "$domain" && "$scheme" == "https" ]]; then
    site_block="${domain}"
  elif [[ -n "$domain" ]]; then
    site_block="http://${domain}"
  else
    site_block=":80"
  fi
  cat >"$INSTALL_DIR/install/Caddyfile" <<EOF
${site_block} {
  encode gzip

  handle /api* {
    reverse_proxy api:4100
  }

  handle /admin* {
    reverse_proxy admin:4101
  }

  handle {
    reverse_proxy storefront:4102
  }
}
EOF
}

compose_pull_up() {
  local version="latest"
  if [[ -f "$INSTALL_DIR/.env" ]]; then
    # shellcheck disable=SC1091
    set -a; source "$INSTALL_DIR/.env"; set +a
    version="${NEOSTORE_VERSION:-latest}"
  fi
  export NEOSTORE_VERSION="$version"
  export NEOSTORE_PULL_POLICY="${NEOSTORE_PULL_POLICY:-always}"

  # Optional: GHCR_TOKEN / GITHUB_TOKEN with read:packages if images are private
  if [[ -n "${GHCR_TOKEN:-${GITHUB_TOKEN:-}}" ]]; then
    log "Logging in to GHCR..."
    echo "${GHCR_TOKEN:-$GITHUB_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-neoauroraproject}" --password-stdin >/dev/null
  fi

  log "Pulling pre-built images (tag: ${version}) from GHCR..."
  if ! compose pull; then
    err "Failed to pull images from ghcr.io"
    echo
    echo "Images must be public (one-time), or set GHCR_TOKEN:"
    echo "  https://github.com/users/neoauroraproject/packages/container/neostore-api/settings"
    echo "  https://github.com/users/neoauroraproject/packages/container/neostore-storefront/settings"
    echo "  https://github.com/users/neoauroraproject/packages/container/neostore-admin/settings"
    echo "Set each package visibility to Public, then retry Update."
    echo "CI status: https://github.com/neoauroraproject/neostore/actions"
    exit 1
  fi
  log "Starting stack (no local build)..."
  compose up -d --remove-orphans
  log "Pruning unused Docker images..."
  docker image prune -f >/dev/null 2>&1 || true
}

ensure_version_in_env() {
  if [[ -f "$INSTALL_DIR/.env" ]] && ! grep -q '^NEOSTORE_VERSION=' "$INSTALL_DIR/.env"; then
    {
      echo "NEOSTORE_VERSION=latest"
      echo "NEOSTORE_PULL_POLICY=always"
    } >>"$INSTALL_DIR/.env"
  fi
}

do_install() {
  need_root
  ensure_docker
  bootstrap_repo
  cd "$INSTALL_DIR"

  echo
  echo -e "${BOLD}NeoStore — Install wizard${NC}"
  echo

  prompt "Domain (empty = IP / localhost only)" ""
  local domain="$REPLY"
  domain="${domain#http://}"
  domain="${domain#https://}"
  domain="${domain%%/*}"

  local scheme="http"
  if [[ -n "$domain" ]]; then
    prompt "Enable HTTPS (Let's Encrypt via Caddy)? [Y/n]" "Y"
    if [[ "${REPLY,,}" != "n" && "${REPLY,,}" != "no" ]]; then
      scheme="https"
    fi
  fi

  prompt "Admin email" "admin@${domain:-localhost}"
  local admin_email="$REPLY"
  prompt_secret "Admin password"
  local admin_password="$REPLY"
  prompt "Admin name" "Admin"
  local admin_name="$REPLY"
  prompt "Store name" "My Store"
  local store_name="$REPLY"
  # Optional: leave empty so the primary shop lives on the domain root (/)
  prompt "Store slug (optional — empty = primary shop on domain root)" ""
  local store_slug
  store_slug="$(slugify "$REPLY")"

  write_env "$domain" "$scheme" "$admin_email" "$admin_password" "$admin_name" "$store_name" "$store_slug"
  write_caddyfile "$domain" "$scheme"

  # Ensure installer script is executable in install dir
  chmod +x "$INSTALL_DIR/install/"*.sh 2>/dev/null || true

  compose_pull_up

  log "Waiting for services (DB + API seed)..."
  local i=0
  until compose exec -T api node -e "require('http').get('http://127.0.0.1:4100/api/docs',r=>process.exit(r.statusCode&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))" 2>/dev/null; do
    i=$((i + 1))
    if [[ $i -ge 90 ]]; then
      warn "API not ready yet — check logs (menu option 6)"
      break
    fi
    sleep 2
  done

  compose exec -T api node prisma/seed.cjs || warn "Seed retry failed (entrypoint may have already seeded)"

  echo
  echo -e "${GREEN}${BOLD}NeoStore installed successfully${NC}"
  if [[ -n "$domain" ]]; then
    echo -e "  Shop:    ${BOLD}${scheme}://${domain}/${NC}"
    echo -e "  Admin:   ${BOLD}${scheme}://${domain}/admin${NC}"
    echo -e "  API:     ${BOLD}${scheme}://${domain}/api/docs${NC}"
  else
    echo -e "  Shop:    ${BOLD}http://SERVER_IP/${NC}"
    echo -e "  Admin:   ${BOLD}http://SERVER_IP/admin${NC}"
    echo -e "  API:     ${BOLD}http://SERVER_IP/api/docs${NC}"
  fi
  echo -e "  Login:   ${BOLD}${admin_email}${NC}  (or admin name: ${BOLD}${admin_name}${NC})"
  echo -e "  Password: (the one you set during install)"
  if [[ -n "$store_slug" ]]; then
    echo -e "  Slug:    ${BOLD}${store_slug}${NC}  (also ${scheme:-http}://${domain:-SERVER_IP}/${store_slug})"
  else
    echo -e "  Slug:    ${BOLD}(empty)${NC}  — primary shop on domain root"
  fi
  echo -e "  Data:    ${BOLD}${INSTALL_DIR}${NC}"
  echo
  echo "Open installer menu again:"
  echo -e "  ${CYAN}bash <(curl -fsSL https://raw.githubusercontent.com/neoauroraproject/neostore/master/install/neostore.sh)${NC}"
  echo -e "  ${CYAN}# or: sudo bash ${INSTALL_DIR}/install/neostore.sh${NC}"
}

do_update() {
  need_root
  is_installed || die "NeoStore is not installed at $INSTALL_DIR"
  ensure_docker
  ensure_git
  cd "$INSTALL_DIR"

  local target_version="${1:-}"
  if [[ -z "$target_version" ]]; then
    # Discover latest GitHub release when possible; fall back to .env / latest
    local latest_tag=""
    latest_tag="$(curl -fsSL -H 'Accept: application/vnd.github+json' \
      "https://api.github.com/repos/neoauroraproject/neostore/releases/latest" 2>/dev/null \
      | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1 || true)"
    if [[ -n "$latest_tag" ]]; then
      prompt "Version to deploy (GitHub latest = ${latest_tag})" "$latest_tag"
      target_version="$REPLY"
    else
      if [[ -f .env ]]; then
        # shellcheck disable=SC1091
        set -a; source .env; set +a
      fi
      prompt "Version to deploy" "${NEOSTORE_VERSION:-latest}"
      target_version="$REPLY"
    fi
  fi
  target_version="${target_version:-latest}"
  if [[ "$target_version" != "latest" && "$target_version" != v* ]]; then
    target_version="v${target_version}"
  fi

  # Keep secrets; discard local edits to tracked installer files from previous install
  local env_bak=""
  if [[ -f .env ]]; then
    env_bak="$(mktemp)"
    cp -a .env "$env_bak"
  fi

  log "Pulling latest installer/compose from git..."
  if [[ -d .git ]]; then
    git fetch --depth 1 origin "$REPO_BRANCH"
    git reset --hard "origin/$REPO_BRANCH"
    git clean -fd -e .env -e .env.bak -e 'install/Caddyfile' 2>/dev/null || true
  else
    warn "Not a git checkout — skipping git pull"
  fi

  if [[ -n "$env_bak" && -f "$env_bak" ]]; then
    cp -a "$env_bak" .env
    rm -f "$env_bak"
  fi
  ensure_version_in_env

  # Pin image tag for this update (entrypoint migrates DB on API boot)
  if grep -q '^NEOSTORE_VERSION=' .env 2>/dev/null; then
    sed -i "s|^NEOSTORE_VERSION=.*|NEOSTORE_VERSION=${target_version}|" .env
  else
    echo "NEOSTORE_VERSION=${target_version}" >>.env
  fi
  if ! grep -q '^NEOSTORE_PULL_POLICY=' .env 2>/dev/null; then
    echo "NEOSTORE_PULL_POLICY=always" >>.env
  fi
  export NEOSTORE_VERSION="$target_version"

  # Regenerate reverse-proxy config from saved domain settings
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -a; source .env; set +a
    write_caddyfile "${DOMAIN:-}" "${TLS_SCHEME:-http}"
  fi

  chmod +x "$INSTALL_DIR/install/"*.sh 2>/dev/null || true
  compose_pull_up

  log "Waiting for API health after migrate/boot (tag: ${target_version})..."
  local i=0
  until compose exec -T api node -e "require('http').get('http://127.0.0.1:4100/api/public',r=>process.exit(r.statusCode&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))" 2>/dev/null; do
    i=$((i + 1))
    if [[ $i -ge 90 ]]; then
      warn "API not healthy yet — check: docker compose logs api --tail=80"
      break
    fi
    sleep 2
  done

  log "Update complete → ${target_version}"
  compose ps
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -a; source .env; set +a
    echo
    echo -e "  Shop:  ${BOLD}${PUBLIC_BASE_URL:-/}/${NC}"
    echo -e "  Admin: ${BOLD}${PUBLIC_BASE_URL:-}/admin${NC}"
    echo -e "  Tag:   ${BOLD}${NEOSTORE_VERSION}${NC}"
  fi
}

do_uninstall() {
  need_root
  is_installed || die "NeoStore is not installed at $INSTALL_DIR"
  echo
  warn "This will stop containers. Optionally delete all data."
  prompt "Type DELETE to remove volumes/data, or ENTER to keep data" ""
  local wipe="$REPLY"
  cd "$INSTALL_DIR"
  if [[ "$wipe" == "DELETE" ]]; then
    compose down -v --remove-orphans || true
    prompt "Also delete $INSTALL_DIR files? [y/N]" "N"
    if [[ "${REPLY,,}" == "y" ]]; then
      rm -rf "$INSTALL_DIR"
      log "Removed $INSTALL_DIR"
    fi
  else
    compose down --remove-orphans || true
    log "Containers stopped. Data volumes kept. Files remain in $INSTALL_DIR"
  fi
}

do_status() {
  if ! is_installed; then
    warn "Not installed at $INSTALL_DIR"
    return
  fi
  compose ps
  echo
  if [[ -f "$INSTALL_DIR/.env" ]]; then
    # shellcheck disable=SC1091
    set -a; source "$INSTALL_DIR/.env"; set +a
    echo "DOMAIN=${DOMAIN:-}"
    echo "PUBLIC_BASE_URL=${PUBLIC_BASE_URL:-}"
    echo "ADMIN_EMAIL=${ADMIN_EMAIL:-}"
    echo "STORE_SLUG=${STORE_SLUG:-}"
  fi
}

do_restart() {
  need_root
  is_installed || die "Not installed"
  compose restart
  log "Restarted."
}

do_logs() {
  is_installed || die "Not installed"
  compose logs -f --tail=200
}

do_change_domain() {
  need_root
  is_installed || die "Not installed"
  # shellcheck disable=SC1091
  set -a; source "$INSTALL_DIR/.env"; set +a
  prompt "New domain" "${DOMAIN:-}"
  local domain="$REPLY"
  domain="${domain#http://}"
  domain="${domain#https://}"
  domain="${domain%%/*}"
  local scheme="http"
  if [[ -n "$domain" ]]; then
    prompt "Enable HTTPS? [Y/n]" "Y"
    if [[ "${REPLY,,}" != "n" && "${REPLY,,}" != "no" ]]; then
      scheme="https"
    fi
  fi
  local base_url
  if [[ -n "$domain" ]]; then
    base_url="${scheme}://${domain}"
  else
    base_url="http://localhost"
  fi
  sed -i.bak -E \
    -e "s|^DOMAIN=.*|DOMAIN=$(env_quote "$domain")|" \
    -e "s|^TLS_SCHEME=.*|TLS_SCHEME=$(env_quote "$scheme")|" \
    -e "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=$(env_quote "$base_url")|" \
    -e "s|^TELEGRAM_WEBHOOK_BASE_URL=.*|TELEGRAM_WEBHOOK_BASE_URL=$(env_quote "$base_url")|" \
    "$INSTALL_DIR/.env"
  write_caddyfile "$domain" "$scheme"
  compose up -d caddy api
  log "Domain updated → ${base_url}"
}

show_menu() {
  clear 2>/dev/null || true
  echo -e "${BOLD}"
  cat <<'BANNER'
  _   _            ____  _
 | \ | | ___  ___ / ___|| |_ ___  _ __ ___
 |  \| |/ _ \/ _ \\___ \| __/ _ \| '__/ _ \
 | |\  |  __/ (_) |___) | || (_) | | |  __/
 |_| \_|\___|\___/|____/ \__\___/|_|  \___|
BANNER
  echo -e "${NC}"
  echo -e "  Self-hosted Marketplace Platform"
  echo -e "  Install dir: ${CYAN}${INSTALL_DIR}${NC}"
  echo
  echo "  1) Install"
  echo "  2) Update"
  echo "  3) Uninstall"
  echo "  4) Status"
  echo "  5) Restart"
  echo "  6) Logs"
  echo "  7) Change domain"
  echo "  0) Exit"
  echo
}

main_menu() {
  while true; do
    show_menu
    prompt "Select" "1"
    case "$REPLY" in
      1) do_install; read -r -p "Press Enter..."; ;;
      2) do_update; read -r -p "Press Enter..."; ;;
      3) do_uninstall; read -r -p "Press Enter..."; ;;
      4) do_status; read -r -p "Press Enter..."; ;;
      5) do_restart; read -r -p "Press Enter..."; ;;
      6) do_logs; ;;
      7) do_change_domain; read -r -p "Press Enter..."; ;;
      0|q|Q) exit 0; ;;
      *) warn "Invalid option"; sleep 1; ;;
    esac
  done
}

# When downloaded via curl|bash, BASH_SOURCE may be in /dev/fd — always bootstrap from git unless already installed
if [[ "${BASH_SOURCE[0]}" == /dev/fd/* || "${BASH_SOURCE[0]}" == /proc/self/fd/* ]]; then
  # Remote bootstrap: clone then re-exec local script with menu
  need_root
  ensure_docker
  ensure_git
  if [[ ! -f "$INSTALL_DIR/install/neostore.sh" ]]; then
    log "Downloading NeoStore to $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
  chmod +x "$INSTALL_DIR/install/neostore.sh"
  exec bash "$INSTALL_DIR/install/neostore.sh" "${1:-menu}"
fi

cmd="${1:-}"
case "$cmd" in
  install) do_install ;;
  update)
    shift || true
    do_update "$@"
    ;;
  uninstall|remove) do_uninstall ;;
  status) do_status ;;
  restart) do_restart ;;
  logs) do_logs ;;
  domain) do_change_domain ;;
  menu|"") main_menu ;;
  *)
    echo "Usage: $0 [menu|install|update [version]|uninstall|status|restart|logs|domain]"
    echo "  update           Interactive / latest GitHub release"
    echo "  update v0.4.1    Pin GHCR tag and recreate stack (DB migrates on API boot)"
    exit 1
    ;;
esac
