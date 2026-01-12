#!/bin/bash

# Colors for different services
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Store PIDs for cleanup
PIDS=()

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    wait
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║              Starting Gashapon Development Services        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Start Backend (NestJS)
echo -e "${GREEN}[Backend]${NC} Starting on port 3001..."
cd "$SCRIPT_DIR/backend" && pnpm start:dev 2>&1 | sed "s/^/$(printf "${GREEN}[Backend]${NC} ")/" &
PIDS+=($!)

# Start Frontend (Next.js)
echo -e "${BLUE}[Frontend]${NC} Starting on port 3000..."
cd "$SCRIPT_DIR/frontend" && pnpm dev 2>&1 | sed "s/^/$(printf "${BLUE}[Frontend]${NC} ")/" &
PIDS+=($!)

# Start Indexer (NestJS)
echo -e "${RED}[Indexer]${NC} Starting..."
cd "$SCRIPT_DIR/gashapon-indexer" && pnpm start:dev 2>&1 | sed "s/^/$(printf "${RED}[Indexer]${NC} ")/" &
PIDS+=($!)

echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[Backend]${NC}  → http://localhost:3001"
echo -e "${BLUE}[Frontend]${NC} → http://localhost:3000"
echo -e "${RED}[Indexer]${NC}  → Running in background"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all processes
wait
