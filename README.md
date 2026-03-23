# FuseClassroomLoadTest

## Project Setup Guide

Before running the tests, ensure the required sample files are present in the **data/** directory at the root of the project. Make sure the file name matches as follows to avoid any errors.

1. Scan Document Sample File

-   Add a sample image for document scanning:
    `sample_image.png (or .jpg/.jpeg)`

2. Audio Sample File

-   Add a sample audio file: `sample_audio.wav`

3. Video Test Sample Files

-   Add three images for video testing: `face_front.jpeg`, `face_right.jpeg` & `face_left.jpeg`

4. Proctoring Files

-   Add three images for video testing: `proctorAudio.wav` & `proctorVideo.webm`

### Directory Structure - Ensure the folder structure is as follows:

    AI-Shikshya/
    ├── data/
    │ ├── sample_image.png
    │ ├── sample_audio.wav
    │ ├── face_front.jpeg
    │ ├── face_right.jpeg
    │ ├── face_left.jpeg
    │ ├── proctoringApiData
    │ |     ├── proctorAudio.wav
    │ |     ├── proctorVideo.webm

## Configuration Setup

#### For single user token: (Optional)

Modify the configuration file by adding the required authentication credentials: Navigate to the config file.

-   Add the following credentials: `Token=YOUR_TOKEN_HERE` & `ID_Token=YOUR_ID_TOKEN_HERE`
-   Replace the values with the actual values obtained from the site.

#### Multi user token:

Currently, this code uses multi user token.

-   For that run the python code: `python3 generate_classroom_tokens.py`.
-   This will generate the csv file named `classroom-test-users-token.csv`.

## Installation Guide

This project uses k6 for load testing. Follow the steps below to install and run the tests.

1. Install k6

-   Linux
    `sudo apt update && sudo apt install k6`
-   macOS
    `brew install k6`
-   Windows
    `choco install k6`

2. Running the Test

-   `k6 run loadTesting.js`
-   Single-user quick validation (recommended while debugging):
    `RUN_MODE=single SINGLE_VUS=1 ITERATIONS=1 SINGLE_MAX_DURATION=2m EXAM_DURATION_MINUTES=2 ENABLE_VARIABLE_SESSION_DURATION=false PROCTOR_INTERVAL_SECONDS=10 k6 run loadTesting.js`

### Concurrency Profiles

-   Ramp-up profile (default):
    `RUN_MODE=rampup k6 run loadTesting.js`
-   True concurrent profile (all users start together):
    `RUN_MODE=concurrent CONCURRENT_VUS=100 CONCURRENT_MAX_DURATION=40m EXAM_DURATION_MINUTES=35 CONCURRENT_FIXED_SESSION_DURATION=true ENABLE_VARIABLE_SESSION_DURATION=false PROCTOR_INTERVAL_SECONDS=30 k6 run loadTesting.js`
-   Peak profile for infra validation (for example 230 users):
    `RUN_MODE=peak PEAK_VUS=230 PEAK_MAX_DURATION=50m EXAM_DURATION_MINUTES=45 CONCURRENT_FIXED_SESSION_DURATION=true ENABLE_VARIABLE_SESSION_DURATION=false PROCTOR_INTERVAL_SECONDS=30 k6 run loadTesting.js`

### Quality Gates

-   The script now enforces these default thresholds:
    - `http_req_failed: rate<0.01`
    - `checks: rate>0.99`
    - `http_req_duration: p(95)<5000`
-   Override if needed:
    - `HTTP_REQ_FAILED_RATE_THRESHOLD`
    - `CHECK_RATE_THRESHOLD`
    - `HTTP_REQ_DURATION_P95_MS`

### Timing Notes (Important)

-   `maxDuration` is a hard cap per scenario; if one iteration takes longer, k6 interrupts it.
-   In this project, long proctoring loops can make one iteration run for many minutes.
-   The script now auto-caps per-user session time based on scenario `maxDuration` (with a small safety buffer) so iterations can finish in short runs.
-   Optional safety buffer override: `SCENARIO_SAFETY_BUFFER_SECONDS=20` (default: `20`).

3. Running With Generator CPU/RAM Monitoring

-   Use the helper script to run k6 and capture load-generator health in logs:
    `bash scripts/run_k6_with_monitoring.sh loadTesting.js`
-   Optional: change sampling interval (default is 2s):
    `MONITOR_INTERVAL_SECONDS=1 bash scripts/run_k6_with_monitoring.sh loadTesting.js`
-   Logs are saved under:
    `report/monitoring_<timestamp>/`
-   Generated files:
    - `k6-output.log` for k6 output
    - `system.log` for CPU/RAM/load, host network throughput, and k6 process usage over time

### Monitoring Scope (Important)

-   `system.log` captures load-generator machine metrics only.
-   For server-side CPU, memory, network, autoscaling events, and pod/instance limits, collect metrics from your infrastructure stack (CloudWatch, Prometheus/Grafana, Datadog, Kubernetes metrics, or VM monitoring).
-   Use the same time window as `k6-output.log` when sharing DevOps metrics for 100 and 230 user runs.

## Report

Make the `report` folder in the root directory where the report will be saved after running the test.
