#!/usr/bin/env bash
# Deploy the BuildVestZK Soroban verifier contract to Stellar testnet.
#
# Prerequisites:
#   - stellar-cli installed (brew install stellar-cli / cargo install --locked stellar-cli --features opt)
#   - Rust wasm32 target: rustup target add wasm32-unknown-unknown
#   - STELLAR_SECRET_KEY env var set to a funded testnet account secret
#
# Usage:
#   ./scripts/deploy-verifier.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="${SCRIPT_DIR}/../contracts/verifier"

if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
  echo "Error: STELLAR_SECRET_KEY is not set." >&2
  exit 1
fi

echo "Building Soroban verifier contract..."
cd "${CONTRACT_DIR}"
stellar contract build

WASM_PATH="target/wasm32-unknown-unknown/release/buildvestzk_verifier.wasm"

if [ ! -f "${WASM_PATH}" ]; then
  echo "Error: WASM artifact not found at ${WASM_PATH}" >&2
  exit 1
fi

echo "Deploying to Stellar testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "${WASM_PATH}" \
  --source "${STELLAR_SECRET_KEY}" \
  --network testnet)

echo ""
echo "========================================="
echo "Verifier contract deployed successfully!"
echo "Contract ID: ${CONTRACT_ID}"
echo "========================================="
echo ""
echo "Set this in your backend .env:"
echo "  SOROBAN_VERIFIER_CONTRACT_ID=${CONTRACT_ID}"
echo "  VERIFICATION_MODE=onchain"
