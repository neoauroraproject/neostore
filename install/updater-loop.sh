#!/bin/sh
# Host updater loop — watches shared storage for panel/CLI update requests.
# Runs as the `updater` compose service with docker.sock mounted.
set -eu

INSTALL_DIR="${INSTALL_DIR:-/opt/neostore}"
REQUEST_FILE="${REQUEST_FILE:-/data/storage/update-request.json}"
STATUS_FILE="${STATUS_FILE:-/data/storage/update-status.json}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POLL_SECONDS="${POLL_SECONDS:-12}"

mkdir -p "$(dirname "$STATUS_FILE")" "$(dirname "$REQUEST_FILE")"

write_status() {
  state="$1"
  message="$2"
  version="${3:-}"
  # shellcheck disable=SC2039
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u)"
  printf '%s\n' "{\"state\":\"${state}\",\"message\":$(printf '%s' "$message" | sed 's/"/\\"/g; s/^/"/; s/$/"/'),\"version\":\"${version}\",\"at\":\"${now}\"}" >"$STATUS_FILE"
}

set_env_version() {
  ver="$1"
  envf="${INSTALL_DIR}/.env"
  if [ ! -f "$envf" ]; then
    echo "NEOSTORE_VERSION=${ver}" >"$envf"
    echo "NEOSTORE_PULL_POLICY=always" >>"$envf"
    return
  fi
  if grep -q '^NEOSTORE_VERSION=' "$envf"; then
    sed -i "s|^NEOSTORE_VERSION=.*|NEOSTORE_VERSION=${ver}|" "$envf"
  else
    echo "NEOSTORE_VERSION=${ver}" >>"$envf"
  fi
  if ! grep -q '^NEOSTORE_PULL_POLICY=' "$envf"; then
    echo "NEOSTORE_PULL_POLICY=always" >>"$envf"
  fi
}

json_get() {
  # minimal extractor: "key":"value"
  key="$1"
  file="$2"
  sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "$file" | head -n 1
}

apply_update() {
  req="$1"
  version="$(json_get version "$req")"
  if [ -z "$version" ] || [ "$version" = "null" ]; then
    version="latest"
  fi
  write_status applying "Pulling images for ${version}" "$version"
  set_env_version "$version"
  export NEOSTORE_VERSION="$version"
  export NEOSTORE_PULL_POLICY=always

  cd "$INSTALL_DIR"
  if ! docker compose -f "$COMPOSE_FILE" pull; then
    write_status failed "docker compose pull failed for ${version}" "$version"
    rm -f "$req"
    return 1
  fi
  write_status applying "Recreating stack (API will migrate DB on boot)" "$version"
  if ! docker compose -f "$COMPOSE_FILE" up -d --remove-orphans; then
    write_status failed "docker compose up failed for ${version}" "$version"
    rm -f "$req"
    return 1
  fi
  docker image prune -f >/dev/null 2>&1 || true
  rm -f "$req"
  write_status success "Updated to ${version}. DB schema applied by API entrypoint." "$version"
}

write_status idle "Updater ready — waiting for panel or CLI request" ""

echo "==> NeoStore updater watching ${REQUEST_FILE}"
while true; do
  if [ -f "$REQUEST_FILE" ]; then
    # avoid double-apply races
    pending="${REQUEST_FILE}.processing"
    if mv "$REQUEST_FILE" "$pending" 2>/dev/null; then
      apply_update "$pending" || true
      rm -f "$pending"
    fi
  fi
  sleep "$POLL_SECONDS"
done
