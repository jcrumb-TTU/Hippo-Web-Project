#!/usr/bin/env bash
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(realpath $(dirname "$SCRIPT_PATH"))
sudo systemctl restart nginx
cd "$SCRIPT_DIR/Hippo-Exchange"
dotnet run
