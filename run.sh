#!/usr/bin/env bash
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(realpath $(dirname "$SCRIPT_PATH"))
REPO_DIR="$(cd $SCRIPT_DIR;git rev-parse --show-toplevel)";
sudo systemctl restart nginx
cd "$REPO_DIR/Hippo-Exchange"
mkdir -p "$REPO_DIR/logs"
dotnet run &> "$REPO_DIR/logs/api.log" &
API_PID=$!
cd "$REPO_DIR/submodules/swagger-validator"
mvn package jetty:run &> "$REPO_DIR/logs/swagger_validator.log" &
MVN_PID=$!
stopServer(){
	echo "Shutting down API & swagger-validator instances..."
	kill -SIGTERM $API_PID;
	kill -SIGTERM $MVN_PID
	wait < <(jobs -p)
	exit 0;
}
trap stopServer SIGINT SIGTERM SIGHUP
wait

