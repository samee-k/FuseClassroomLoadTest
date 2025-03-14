import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, TOKEN, ID_TOKEN, ORIGIN } from "../libs/config.js";
import { trackMetrics, screenViolationMetrics } from "../libs/metrics.js";

export function screenViolation() {
    const url = `${BASE_URL}/api/proctor/meetings/screen-violations`;

    const payload = JSON.stringify({
        quizId: "67ce9d5f14fc1a56509eafb2",
        type: "TAB_SWITCHING",
        startAt: 6,
        duration: 1,
    });

    let headers = {
        Authorization: TOKEN,
        idToken: ID_TOKEN,
        Origin: ORIGIN,
        "Content-Type": "application/json",
    };

    let res = http.post(url, payload, {
        headers: headers,
        tags: { api: "screenViolation" },
    });

    let jsonResponse = {};
    if (res.status === 200) {
        try {
            jsonResponse = res.json();
        } catch (error) {
            console.error(
                "Failed to parse JSON response in Screen Violation Report",
                res.body
            );
        }
    } else {
        console.error(
            `Received unexpected status code in Screen Violation Report: ${res.status}. Response body: ${res.body}`
        );
    }

    check(res, {
        "screen violation report successful": (r) => r.status === 200,
    });

    trackMetrics(res, screenViolationMetrics);

    sleep(1);
}
