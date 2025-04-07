import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../libs/config.js";
import { trackMetrics, screenViolationMetrics } from "../libs/metrics.js";

export function screenViolation(token, id_token, quizId) {
    const url = `${BASE_URL}/api/proctor/meetings/screen-violations`;

    const payload = JSON.stringify({
        quizId: `${quizId}`,
        type: "TAB_SWITCHING",
        startAt: 6,
        duration: 1,
    });

    let headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": "application/json",
    };

    let res = http.post(url, payload, {
        headers: headers,
        tags: {
            api: "screen-violation",
            method: "POST",
            target: "/api/proctor/meetings/screen-violations",
        },
    });

    check(res, {
        "Screen violation report successful": (r) => r.status === 200,
    });

    trackMetrics(res, screenViolationMetrics, "screenViolationApi");

    return res;
}
