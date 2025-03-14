import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TOKEN, ID_TOKEN, ORIGIN } from "../../libs/config.js";

export function userInfo() {
    let url = `${BASE_URL}/users/info`;

    let headers = {
        Authorization: TOKEN,
        idToken: ID_TOKEN,
        Origin: ORIGIN,
        "Content-Type": "application/json",
    };

    let res = http.get(url, { headers: headers, tags: { api: "userInfo" } });

    check(res, {
        "user info get successful": (r) => r.status === 200,
        "Response time < 500ms": (r) => r.timings.duration < 500,
    });
}
