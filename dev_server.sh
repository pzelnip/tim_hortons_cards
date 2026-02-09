#!/bin/sh

cd docs
python3 -m http.server 9214 &
SERVER_PID=$!
trap "kill $SERVER_PID" EXIT
sleep 1
open http://localhost:9214/2026_olympics.html#VnTU0RV0sulk0VEVwASAC0xM3znJ_-A
wait $SERVER_PID
