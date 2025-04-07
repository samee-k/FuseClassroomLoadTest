import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../../libs/config.js";

export function userInfo(token, id_token) {
    let url = `${BASE_URL}/users/info`;

    let headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": "application/json",
    };

    let res = http.get(url, {
        headers: headers,
        tags: { api: "userInfo", method: "GET", target: "/users/info" },
    });

    check(res, {
        "User info get successful": (r) => r.status === 200,
    });
}
