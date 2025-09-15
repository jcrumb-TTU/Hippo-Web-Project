#!/usr/bin/env bash
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(realpath $(dirname "$SCRIPT_PATH"))
REPO_DIR="$(cd $SCRIPT_DIR;git rev-parse --show-toplevel)";
sudo systemctl restart nginx
echo "$SCRIPT_DIR"
echo "$REPO_DIR"
cd "$REPO_DIR/Hippo-Exchange"
mkdir -p "$REPO_DIR/logs"
dotnet run &>> "$REPO_DIR/logs/api.log" &
cd "$REPO_DIR/submodules/swagger-validator"
mvn package jetty:run &>> "$REPO_DIR/logs/swagger_validator.log" &
wait

