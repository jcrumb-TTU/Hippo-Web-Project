#!/usr/bin/env bash
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(realpath $(dirname "$SCRIPT_PATH"))
REPO_DIR="$(cd $SCRIPT_DIR;git rev-parse --show-toplevel)";
scan_mvn_log(){
# Do this first so we don't somehow miss it.
(tail -F "$REPO_DIR/logs/swagger_validator.log" | grep -q -E ".*Started Jetty Server.*"  && exit);
}


sudo systemctl restart nginx
cd "$REPO_DIR/Hippo-Exchange"
mkdir -p "$REPO_DIR/logs"
echo "Starting API..."
~/.dotnet/dotnet run &> "$REPO_DIR/logs/api.log" &
API_PID=$!
echo "Starting the swagger .yaml validator (This may take a while, we'll let you know when its done. The actual API is ready for testing.)"
cd "$REPO_DIR/submodules/swagger-validator"
coproc scan_mvn_log;
TAIL_PID=$COPROC_PID
mvn package jetty:run &> "$REPO_DIR/logs/swagger_validator.log" &
MVN_PID=$!
stopServer(){
	echo "Shutting down API & swagger-validator instances..."
	ps -p $API_PID >/dev/null && kill -SIGTERM $API_PID;
	ps -p $MVN_PID >/dev/null && kill -SIGTERM $MVN_PID;
	ps -p $TAIL_PID >/dev/null && kill -SIGTERM $TAIL_PID;
	wait < <(jobs -p)
	exit 0;
}
trap stopServer SIGINT SIGTERM SIGHUP
wait $TAIL_PID 
echo "The validator is now running!"
wait
