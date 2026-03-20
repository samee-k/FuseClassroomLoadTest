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
import { TOKEN, ID_TOKEN } from "./libs/config.js";

const vusConfigured = Number(__ENV.VUS || 10);
const iterationsConfigured = 1;
const precheckSleepSeconds = Number(__ENV.PRECHECK_SLEEP_SECONDS || 5);
const examDurationSeconds = Number(__ENV.EXAM_DURATION_SECONDS || 3600);
const proctorEventIntervalSeconds = Number(
    __ENV.PROCTOR_EVENT_INTERVAL_SECONDS || 30
);
const runPeriodicScreenViolation =
    (__ENV.RUN_PERIODIC_SCREEN_VIOLATION || "false") === "true";
const periodicViolationEvery = Number(__ENV.PERIODIC_VIOLATION_EVERY || 10);
const useConfigToken = (__ENV.USE_CONFIG_TOKEN || "false") === "true";
const realisticLoad = (__ENV.REALISTIC_LOAD || "false") === "true";
const startSpreadSeconds = Number(__ENV.START_SPREAD_SECONDS || 300);
const maxDurationSeconds = examDurationSeconds + 900 + startSpreadSeconds;

let isoDate;

const fileContent = useConfigToken
    ? ""
    : open("classroom-test-users-token.csv"); // Read CSV file

const parsedData = useConfigToken
    ? []
    : papaparse
          .parse(fileContent, { header: true, skipEmptyLines: true })
          .data.filter(
              (row) => row.access_token && row.access_token.trim().length > 0
          );

export function setup() {
    if (useConfigToken) {
        if (!TOKEN || !ID_TOKEN) {
            throw new Error(
                "Config token mode enabled, but TOKEN/ID_TOKEN are missing in libs/config.js or env vars."
            );
        }

        let now = new Date();
        isoDate = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString();

        return { isoDate };
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
    scenarios: {
        oneIterationPerUser: {
            executor: "per-vu-iterations",
            vus: vusConfigured, //No. of VUs
            iterations: iterationsConfigured, //  Total iterations = VUs (each VU runs once)
            maxDuration: `${maxDurationSeconds}s`,
        },
    },
};
// Default function to run the tests sequentially when scenarios are not used
export default function (data) {
    let token = TOKEN;
    let id_token = ID_TOKEN;

    if (!useConfigToken) {
        let vuIndex = __VU - 1; // Each VU gets a unique index

        if (vuIndex >= parsedData.length) {
            console.error(`🚨 ERROR: Not enough unique tokens for VU ${__VU}`);
            return;
        }

        let user = parsedData[vuIndex]; // Directly assign a unique user per VU
        token = user.access_token.trim() || "MISSING_TOKEN";
        id_token = user.id_tokenstaggered?.trim() || "MISSING_ID_TOKEN";
    }

    // console.log(`VU ${__VU} using access_token: ${token}`);

    // Stagger the pre-check start per VU to avoid a thundering-herd startup spike.
    if (realisticLoad && startSpreadSeconds > 0 && vusConfigured > 1) {
        const position = (__VU - 1) / (vusConfigured - 1);
        const staggerDelaySeconds = Math.round(position * startSpreadSeconds);
        sleep(staggerDelaySeconds);
    }

    const isoDate = data.isoDate;
    group(
        `Main Group VU ${vusConfigured} and ITER ${iterationsConfigured}` +
            isoDate,
        () => {
            const quizId = fetchQuiz(token, id_token);
            if (!quizId) {
                console.error(
                    `🚨 ERROR: quizId not found for VU ${__VU}. Skipping remaining steps.`
                );
                return;
            }

            // Pre-exam checks happen once before the student starts the exam.
            microphoneTest(token, id_token, quizId);
            sleep(precheckSleepSeconds);

            videoTest(token, id_token, quizId);
            sleep(precheckSleepSeconds);

            const endAtMs = Date.now() + examDurationSeconds * 1000;
            let eventCount = 0;

            // During the exam, students stay active and periodically send events.
            while (Date.now() < endAtMs) {
                eventCount += 1;
                proctorTest(token, id_token, quizId);

                if (
                    runPeriodicScreenViolation &&
                    eventCount % periodicViolationEvery === 0
                ) {
                    screenViolation(token, id_token, quizId);
                }

                const remainingSeconds = Math.ceil((endAtMs - Date.now()) / 1000);
                if (remainingSeconds <= 0) {
                    break;
                }

                sleep(Math.min(proctorEventIntervalSeconds, remainingSeconds));
            }
        }
    );
}

export function handleSummary(data) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, "-").split(".")[0];

    return {
        [`./report/report_VUs${vusConfigured}_ITER${iterationsConfigured}_${timestamp}.html`]:
            htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
        // "summary.json": JSON.stringify(data),
    };
}
