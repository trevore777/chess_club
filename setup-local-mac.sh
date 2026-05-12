#!/bin/bash
set -e

echo "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install it with Homebrew:"
  echo "  brew install node"
  exit 1
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

./install.sh
