#!/usr/bin/env bash
# Thin wrapper — prefer: bash install/neostore.sh
exec "$(cd "$(dirname "$0")" && pwd)/neostore.sh" install
