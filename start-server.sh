#!/bin/bash

# Slitherlink Server Launcher
# This script starts a local HTTP server to serve the Slitherlink puzzle application

echo "🚀 Starting Slitherlink Server..."
echo "📁 Directory: $(pwd)"
echo "🌐 URL: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"

# Start Python HTTP server on port 8080
python3 -m http.server 8080

echo ""
echo "Server stopped."
