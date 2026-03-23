// main.js
import { microphoneTest } from "./scripts/microphoneTest.js";
import { videoTest } from "./scripts/videoTest.js";
import { screenViolation } from "./scripts/screenViolation.js";

import { group, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";
import { proctorTest } from "./scripts/proctoringTest.js";
import { fetchQuiz } from "./scripts/get-apis/fetchQuiz.js";

const rampupCohortDefinitions = [
    { name: "cohort_1", vus: 20, startTime: "0s" },
    { name: "cohort_2", vus: 30, startTime: "1m" },
    { name: "cohort_3", vus: 40, startTime: "3m" },
    { name: "cohort_4", vus: 30, startTime: "6m" },
    { name: "cohort_5", vus: 30, startTime: "10m" },
];

function getEnvInt(name, fallback) {
    const raw = __ENV[name];
    if (!raw) {
        return fallback;
    }

    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvBool(name, fallback) {
    const raw = __ENV[name];
    if (!raw) {
        return fallback;
    }

    return raw.toLowerCase() === "true";
}

// Default to ramp-up mode so `k6 run loadTesting.js` exercises the 150-user cohort plan.
const runMode = (__ENV.RUN_MODE || "rampup").toLowerCase();
const iterationsConfigured = getEnvInt("ITERATIONS", 1);
const sleepConfig = getEnvInt("SLEEP_SECONDS", 5); // 5s sleep time
const proctoringIntervalSeconds = getEnvInt("PROCTOR_INTERVAL_SECONDS", 30);
const examDurationMinutes = getEnvInt("EXAM_DURATION_MINUTES", 60);
const enableVariableSessionDuration = getEnvBool(
    "ENABLE_VARIABLE_SESSION_DURATION",
    true
);
const minUserSessionMinutes = getEnvInt("MIN_USER_SESSION_MINUTES", 20);
const maxUserSessionMinutes = getEnvInt("MAX_USER_SESSION_MINUTES", 60);

const singleUserVus = getEnvInt("SINGLE_VUS", 1);
const singleMaxDuration = __ENV.SINGLE_MAX_DURATION || "2m";

const concurrentVus = getEnvInt("CONCURRENT_VUS", 70);
const concurrentMaxDuration = __ENV.CONCURRENT_MAX_DURATION || "30m";
const concurrentFixedSessionDuration = getEnvBool(
    "CONCURRENT_FIXED_SESSION_DURATION",
    true
);

const peakVus = getEnvInt("PEAK_VUS", 230);
const peakMaxDuration = __ENV.PEAK_MAX_DURATION || "45m";

const rampupScenarioMaxDuration = __ENV.RAMPUP_MAX_DURATION || "1h";
const httpReqFailedRateThreshold =
    __ENV.HTTP_REQ_FAILED_RATE_THRESHOLD || "rate<0.01";
const checkRateThreshold = __ENV.CHECK_RATE_THRESHOLD || "rate>0.99";
const httpReqDurationP95Ms = getEnvInt("HTTP_REQ_DURATION_P95_MS", 5000);

function parseDurationToSeconds(duration) {
    if (!duration || typeof duration !== "string") {
        return null;
    }

    const match = duration.trim().match(/^(\d+)(ms|s|m|h)$/i);
    if (!match) {
        return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (!Number.isFinite(value)) {
        return null;
    }

    if (unit === "ms") {
        return Math.max(1, Math.floor(value / 1000));
    }

    if (unit === "s") {
        return value;
    }

    if (unit === "m") {
        return value * 60;
    }

    if (unit === "h") {
        return value * 3600;
    }

    return null;
}

function getScenarioMaxDurationSeconds() {
    if (runMode === "single") {
        return parseDurationToSeconds(singleMaxDuration);
    }

    if (runMode === "concurrent") {
        return parseDurationToSeconds(concurrentMaxDuration);
    }

    if (runMode === "peak") {
        return parseDurationToSeconds(peakMaxDuration);
    }

    return parseDurationToSeconds(rampupScenarioMaxDuration);
}

const scenarioMaxDurationSeconds = getScenarioMaxDurationSeconds();
// Leave room for setup API calls and sleep gaps before force-stop.
const scenarioSafetyBufferSeconds = getEnvInt("SCENARIO_SAFETY_BUFFER_SECONDS", 20);

function buildScenarios() {
    if (runMode === "single") {
        return {
            single_validation: {
                executor: "per-vu-iterations",
                vus: Math.max(1, singleUserVus),
                iterations: iterationsConfigured,
                maxDuration: singleMaxDuration,
                startTime: "0s",
            },
        };
    }

    if (runMode === "concurrent") {
        return {
            concurrent_users: {
                executor: "per-vu-iterations",
                vus: Math.max(1, concurrentVus),
                iterations: iterationsConfigured,
                maxDuration: concurrentMaxDuration,
                startTime: "0s",
            },
        };
    }

    if (runMode === "peak") {
        return {
            peak_concurrency: {
                executor: "per-vu-iterations",
                vus: Math.max(1, peakVus),
                iterations: iterationsConfigured,
                maxDuration: peakMaxDuration,
                startTime: "0s",
            },
        };
    }

    return Object.fromEntries(
        rampupCohortDefinitions.map(({ name, vus, startTime }) => [
            name,
            {
                executor: "per-vu-iterations",
                vus,
                iterations: iterationsConfigured,
                maxDuration: rampupScenarioMaxDuration,
                startTime,
            },
        ])
    );
}

const scenarios = buildScenarios();

const totalUsersConfigured = Object.values(scenarios).reduce(
    (sum, scenario) => sum + scenario.vus,
    0
);

function getUserSessionDurationMinutes() {
    if (
        (runMode === "concurrent" || runMode === "peak") &&
        concurrentFixedSessionDuration
    ) {
        return examDurationMinutes;
    }

    if (!enableVariableSessionDuration) {
        return examDurationMinutes;
    }

    const safeMin = Math.max(1, minUserSessionMinutes);
    const safeMax = Math.max(safeMin, maxUserSessionMinutes);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

let isoDate;

const fileContent = open("classroom-test-users-token.csv"); // Read CSV file

const parsedData = papaparse
    .parse(fileContent, { header: true, skipEmptyLines: true })
    .data.filter(
        (row) => row.access_token && row.access_token.trim().length > 0
    );

export function setup() {
    if (parsedData.length < totalUsersConfigured) {
        throw new Error(
            `Insufficient tokens: need ${totalUsersConfigured}, found ${parsedData.length}.`
        );
    }

    const tokenSet = new Set();
    let hasDuplicate = false;

    for (const user of parsedData) {
        const token = user.access_token.trim();
        if (tokenSet.has(token)) {
            console.error(`🚨 DUPLICATE TOKEN IN CSV: ${token}`);
            hasDuplicate = true;
        }
        tokenSet.add(token);
    }

    if (hasDuplicate) {
        throw new Error("❌ Load Test Stopped: Duplicate tokens found in CSV.");
    }

    let now = new Date();
    isoDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString();

    console.log(
        `[setup] runMode=${runMode} users=${totalUsersConfigured} iterations=${iterationsConfigured} proctorIntervalSeconds=${proctoringIntervalSeconds}`
    );

    return { isoDate };
}

// export let options = {
//     stages: [
//         { duration: "1m", target: 1 }, // Ramp up to 1 VU in 1 minute
//         { duration: "2m", target: 3 }, // Ramp up to 3 VUs in 1 minute
//         { duration: "2m", target: 5 }, // Ramp up to 5 VUs in 2 minutes
//         { duration: "5m", target: 5 }, // Hold at 5 VUs for 5 minutes
//         { duration: "1m", target: 2 }, // Ramp down to 2 VUs in 1 minute
//         { duration: "1m", target: 0 }, // Ramp down to 0 VUs in 1 minute
//     ],
// };

export let options = {
    scenarios,
    thresholds: {
        http_req_failed: [httpReqFailedRateThreshold],
        checks: [checkRateThreshold],
        http_req_duration: [`p(95)<${Math.max(1, httpReqDurationP95Ms)}`],
    },
};

// Default function to run the tests sequentially when scenarios are not used
export default function (data) {
    let vuIndex = __VU - 1; // Each VU gets a unique index

    if (vuIndex >= parsedData.length) {
        console.error(`🚨 ERROR: Not enough unique tokens for VU ${__VU}`);
        return;
    }

    let user = parsedData[vuIndex]; // Directly assign a unique user per VU
    let token = user.access_token.trim() || "MISSING_TOKEN";
    let id_token = user.id_token?.trim() || "MISSING_ID_TOKEN";

    // console.log(`VU ${__VU} using access_token: ${token}`);

    const isoDate = data.isoDate;
    group(
        `Main Group VU ${totalUsersConfigured} and ITER ${iterationsConfigured}` +
            isoDate,
        () => {
            const quizId = fetchQuiz(token, id_token);

            if (!quizId) {
                console.error(`🚨 ERROR: Missing quizId for VU ${__VU}`);
                return;
            }

            microphoneTest(token, id_token, quizId);
            sleep(sleepConfig);

            videoTest(token, id_token, quizId);
            sleep(sleepConfig);

            screenViolation(token, id_token, quizId);
            sleep(sleepConfig);

            const userSessionMinutes = getUserSessionDurationMinutes();
            const requestedSessionSeconds =
                Math.min(userSessionMinutes, examDurationMinutes) * 60;
            const scenarioBudgetSeconds =
                scenarioMaxDurationSeconds === null
                    ? requestedSessionSeconds
                    : Math.max(
                          proctoringIntervalSeconds,
                          scenarioMaxDurationSeconds - scenarioSafetyBufferSeconds
                      );
            const effectiveSessionSeconds = Math.min(
                requestedSessionSeconds,
                scenarioBudgetSeconds
            );

            const examEndAt = Date.now() + effectiveSessionSeconds * 1000;

            while (Date.now() < examEndAt) {
                proctorTest(token, id_token, quizId);

                // Stop immediately after the last call if exam window has ended.
                if (Date.now() >= examEndAt) {
                    break;
                }

                sleep(proctoringIntervalSeconds);
            }
        }
    );
}

export function handleSummary(data) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, "-").split(".")[0];

    return {
        [`./report/report_VUs${totalUsersConfigured}_ITER${iterationsConfigured}_${timestamp}.html`]:
            htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
        // "summary.json": JSON.stringify(data),
    };
}
