#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

K6_SCRIPT="${1:-loadTesting.js}"
INTERVAL_SECONDS="${MONITOR_INTERVAL_SECONDS:-2}"
TIMESTAMP="$(date +"%Y-%m-%dT%H-%M-%S")"
LOG_DIR="$ROOT_DIR/report/monitoring_$TIMESTAMP"
SYSTEM_LOG="$LOG_DIR/system.log"
K6_LOG="$LOG_DIR/k6-output.log"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

echo "Starting k6 script: $K6_SCRIPT"
echo "Monitoring interval: ${INTERVAL_SECONDS}s"
echo "Logs directory: $LOG_DIR"

k6 run "$K6_SCRIPT" >"$K6_LOG" 2>&1 &
K6_PID=$!

echo "k6 PID: $K6_PID" | tee -a "$SYSTEM_LOG"
echo "timestamp,total_mem_mb,used_mem_mb,available_mem_mb,swap_used_mb,load_1m,cpu_count,net_rx_bytes,net_tx_bytes,net_rx_kib_s,net_tx_kib_s,k6_cpu_percent,k6_mem_percent,k6_rss_mb,k6_vsz_mb" >>"$SYSTEM_LOG"

get_net_bytes() {
    awk -F '[: ]+' '/:/ && $1 !~ /lo/ {rx += $3; tx += $11} END {print rx+0, tx+0}' /proc/net/dev
}

read -r prev_rx_bytes prev_tx_bytes < <(get_net_bytes)
prev_sample_epoch="$(date +%s)"

while kill -0 "$K6_PID" >/dev/null 2>&1; do
    timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
    sample_epoch="$(date +%s)"

    read -r total used free shared buff_cache available < <(free -m | awk '/^Mem:/ {print $2, $3, $4, $5, $6, $7}')
    swap_used="$(free -m | awk '/^Swap:/ {print $3}')"
    load_1m="$(awk '{print $1}' /proc/loadavg)"
    cpu_count="$(nproc)"
    read -r current_rx_bytes current_tx_bytes < <(get_net_bytes)

    elapsed_seconds="$((sample_epoch - prev_sample_epoch))"
    if [[ "$elapsed_seconds" -le 0 ]]; then
        elapsed_seconds=1
    fi

    rx_bytes_delta="$((current_rx_bytes - prev_rx_bytes))"
    tx_bytes_delta="$((current_tx_bytes - prev_tx_bytes))"

    if [[ "$rx_bytes_delta" -lt 0 ]]; then
        rx_bytes_delta=0
    fi
    if [[ "$tx_bytes_delta" -lt 0 ]]; then
        tx_bytes_delta=0
    fi

    net_rx_kib_s="$((rx_bytes_delta / elapsed_seconds / 1024))"
    net_tx_kib_s="$((tx_bytes_delta / elapsed_seconds / 1024))"

    if ps -p "$K6_PID" >/dev/null 2>&1; then
        read -r k6_cpu k6_mem k6_rss_kb k6_vsz_kb < <(ps -p "$K6_PID" -o %cpu,%mem,rss,vsz --no-headers | awk '{print $1, $2, $3, $4}')
        k6_rss_mb="$((k6_rss_kb / 1024))"
        k6_vsz_mb="$((k6_vsz_kb / 1024))"
    else
        k6_cpu="0"
        k6_mem="0"
        k6_rss_mb="0"
        k6_vsz_mb="0"
    fi

    echo "$timestamp,$total,$used,$available,$swap_used,$load_1m,$cpu_count,$current_rx_bytes,$current_tx_bytes,$net_rx_kib_s,$net_tx_kib_s,$k6_cpu,$k6_mem,$k6_rss_mb,$k6_vsz_mb" >>"$SYSTEM_LOG"

    prev_rx_bytes="$current_rx_bytes"
    prev_tx_bytes="$current_tx_bytes"
    prev_sample_epoch="$sample_epoch"
    sleep "$INTERVAL_SECONDS"
done

wait "$K6_PID"
K6_EXIT_CODE=$?

echo "k6 finished with exit code: $K6_EXIT_CODE" | tee -a "$SYSTEM_LOG"
echo "k6 output log: $K6_LOG"
echo "monitoring log: $SYSTEM_LOG"

exit "$K6_EXIT_CODE"
