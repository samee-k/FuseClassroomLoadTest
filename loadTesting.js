// main.js
import { scanDocument } from "./scripts/scanDocument.js";
import { microphoneTest } from "./scripts/microphoneTest.js";
import { videoTest } from "./scripts/videoTest.js";
import { screenViolation } from "./scripts/screenViolation.js";

import { group, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";
import { proctorTest } from "./scripts/proctoringTest.js";
import { fetchQuiz } from "./scripts/get-apis/fetchQuiz.js";

const vusConfigured = 10;
const iterationsConfigured = 1;
const sleepConfig = 5; //5s sleep time

let isoDate;

const fileContent = open("classroom-test-users-token.csv"); // Read CSV file

const parsedData = papaparse
    .parse(fileContent, { header: true, skipEmptyLines: true })
    .data.filter(
        (row) => row.access_token && row.access_token.trim().length > 0
    );

export function setup() {
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
            maxDuration: "1h", // Ensure test doesn't run indefinitely
        },
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
        `Main Group VU ${vusConfigured} and ITER ${iterationsConfigured}` +
            isoDate,
        () => {
            const quizId = fetchQuiz(token, id_token);

            microphoneTest(token, id_token, quizId);
            sleep(sleepConfig);

            videoTest(token, id_token, quizId);
            sleep(sleepConfig);

            screenViolation(token, id_token, quizId);
            sleep(sleepConfig);

            proctorTest(token, id_token, quizId);
            sleep(sleepConfig);
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
