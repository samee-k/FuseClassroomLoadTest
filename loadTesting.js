// main.js
import { scanDocument } from "./scripts/scanDocument.js";
import { microphoneTest } from "./scripts/microphoneTest.js";
import { videoTest } from "./scripts/videoTest.js";
import { screenViolation } from "./scripts/screenViolation.js";
import { group, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { userInfo } from "./scripts/get-apis/userInfo.js";

export let options = {
    stages: [
        { duration: "1m", target: 1 }, // Ramp up to 1 VU in 1 minute
        { duration: "2m", target: 3 }, // Ramp up to 3 VUs in 1 minute
        { duration: "2m", target: 5 }, // Ramp up to 5 VUs in 2 minutes
        { duration: "5m", target: 5 }, // Hold at 5 VUs for 5 minutes
        { duration: "1m", target: 2 }, // Ramp down to 2 VUs in 1 minute
        { duration: "1m", target: 0 }, // Ramp down to 0 VUs in 1 minute
    ],
};

// Default function to run the tests sequentially when scenarios are not used
export default function () {
    group("Scan Test Report", () => {
        scanDocument();
        sleep(30);
    });

    group("Microphone Test", () => {
        microphoneTest();
        sleep(30);
    });

    group("Video Test Report", () => {
        videoTest();
        // sleep(30);
    });

    // group("Screen Violation Report", () => {
    //     screenViolation();
    //     sleep(1);
    // });

    // userInfo();
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: "  " }),
        "report.html": htmlReport(data),
        // "summary.json": JSON.stringify(data),
    };
}
