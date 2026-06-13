#!/bin/sh

# Start the Express server in the background
node src/server.js &
SERVER_PID=$!

# Start the worker in the background
node src/workers/scanner.worker.js &
WORKER_PID=$!

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
