#!/bin/bash
echo "========================================================"
echo "  KothaFlow Desktop Voice Typing - Starting..."
echo "========================================================"
if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies..."
    npm install
fi
echo "[*] Launching KothaFlow Desktop..."
npm start
