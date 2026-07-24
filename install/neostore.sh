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
POSTGRES_PASSWORD=${pgpass}
POSTGRES_DB=neostore
DATABASE_URL=postgresql://neostore:${pgpass}@postgres:5432/neostore
REDIS_URL=redis://redis:6379
JWT_SECRET=${jwt}
PUBLIC_BASE_URL=${base_url}
TELEGRAM_WEBHOOK_BASE_URL=${base_url}
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/data/storage
DOMAIN=${domain}
TLS_SCHEME=${scheme}
ADMIN_EMAIL=${admin_email}
ADMIN_PASSWORD=${admin_password}
ADMIN_NAME=${admin_name}
STORE_NAME=${store_name}
STORE_SLUG=${store_slug}
EOF
  chmod 600 "$INSTALL_DIR/.env"
}

write_caddyfile() {
  local domain="$1"
  local scheme="$2"
  mkdir -p "$INSTALL_DIR/install"
  if [[ -n "$domain" && "$scheme" == "https" ]]; then
    cat >"$INSTALL_DIR/install/Caddyfile" <<EOF
${domain} {
  encode gzip
  reverse_proxy api:4100
}
EOF
  elif [[ -n "$domain" ]]; then
    cat >"$INSTALL_DIR/install/Caddyfile" <<EOF
http://${domain} {
  encode gzip
  reverse_proxy api:4100
}
EOF
  else
    cat >"$INSTALL_DIR/install/Caddyfile" <<EOF
:80 {
  encode gzip
  reverse_proxy api:4100
}
EOF
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
  local default_slug
  default_slug="$(slugify "$store_name")"
  [[ -n "$default_slug" ]] || default_slug="store"
  prompt "Store slug (shop id)" "$default_slug"
  local store_slug
  store_slug="$(slugify "$REPLY")"
  [[ -n "$store_slug" ]] || store_slug="store"

  write_env "$domain" "$scheme" "$admin_email" "$admin_password" "$admin_name" "$store_name" "$store_slug"
  write_caddyfile "$domain" "$scheme"

  # Ensure installer script is executable in install dir
  chmod +x "$INSTALL_DIR/install/"*.sh 2>/dev/null || true

  log "Building and starting containers..."
  compose pull || true
  compose up -d --build

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
    echo -e "  URL:     ${BOLD}${scheme}://${domain}${NC}"
    echo -e "  API:     ${BOLD}${scheme}://${domain}/api/docs${NC}"
  else
    echo -e "  URL:     ${BOLD}http://SERVER_IP/${NC}  (Caddy :80)"
    echo -e "  API:     ${BOLD}http://SERVER_IP/api/docs${NC}"
  fi
  echo -e "  Admin:   ${BOLD}${admin_email}${NC}"
  echo -e "  Shop:    slug ${BOLD}${store_slug}${NC}"
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
  log "Pulling latest code..."
  if [[ -d .git ]]; then
    git fetch --depth 1 origin "$REPO_BRANCH"
    git checkout -B "$REPO_BRANCH" "origin/$REPO_BRANCH"
  else
    warn "Not a git checkout — skipping git pull"
  fi
  chmod +x "$INSTALL_DIR/install/"*.sh 2>/dev/null || true
  log "Rebuilding..."
  compose up -d --build
  log "Update complete."
  compose ps
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
    -e "s|^DOMAIN=.*|DOMAIN=${domain}|" \
    -e "s|^TLS_SCHEME=.*|TLS_SCHEME=${scheme}|" \
    -e "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=${base_url}|" \
    -e "s|^TELEGRAM_WEBHOOK_BASE_URL=.*|TELEGRAM_WEBHOOK_BASE_URL=${base_url}|" \
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
  echo "  1) Install          نصب"
  echo "  2) Update           به‌روزرسانی"
  echo "  3) Uninstall        حذف"
  echo "  4) Status           وضعیت"
  echo "  5) Restart          ری‌استارت"
  echo "  6) Logs             لاگ‌ها"
  echo "  7) Change domain    تغییر دامنه"
  echo "  0) Exit             خروج"
  echo
}

main_menu() {
  while true; do
    show_menu
    prompt "Select / انتخاب" "1"
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
  update) do_update ;;
  uninstall|remove) do_uninstall ;;
  status) do_status ;;
  restart) do_restart ;;
  logs) do_logs ;;
  domain) do_change_domain ;;
  menu|"") main_menu ;;
  *)
    echo "Usage: $0 [menu|install|update|uninstall|status|restart|logs|domain]"
    exit 1
    ;;
esac
