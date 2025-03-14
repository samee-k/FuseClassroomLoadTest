import http from "k6/http";
import { check } from "k6";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";
import { BASE_URL, TOKEN, ID_TOKEN, ORIGIN } from "../libs/config.js";
import { trackMetrics, videoTestMetrics } from "../libs/metrics.js";

// Load multiple files in binary mode
const faceFront = open("../data/face_front.jpeg", "b");
const faceLeft = open("../data/face_left.jpeg", "b");
const faceRight = open("../data/face_right.jpeg", "b");

export function videoTest() {
    let fd = new FormData();

    fd.append("files", http.file(faceFront, "face_front.jpeg", "image/jpeg"));
    fd.append("files", http.file(faceLeft, "face_left.jpeg", "image/jpeg"));
    fd.append("files", http.file(faceRight, "face_right.jpeg", "image/jpeg"));

    let headers = {
        Authorization: TOKEN,
        idToken: ID_TOKEN,
        Origin: ORIGIN,
        "Content-Type": "multipart/form-data; boundary=" + fd.boundary,
    };

    // Check if files loaded correctly
    if (!faceFront || !faceLeft || !faceRight) {
        console.error("❌ One or more files could not be loaded!");
    } else {
        console.log(`✅ Loaded files:
    - faceFront: ${faceFront.byteLength} bytes
    - faceLeft: ${faceLeft.byteLength} bytes
    - faceRight: ${faceRight.byteLength} bytes`);
    }

    let url = `${BASE_URL}/api/proctor/meetings/62ad8f8aff41e2290109cddf/proctor-validator?finalCall=true&fileType=image`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: { api: "videoTest" },
        timeout: "120s",
    });

    let jsonResponse = {};
    if (res.status === 200) {
        try {
            jsonResponse = res.json();
        } catch (error) {
            console.error(
                "Failed to parse JSON response in videoTest:",
                res.body
            );
        }
    } else {
        console.error(
            `Received unexpected status code in Video Test: ${res.status}. Response body: ${res.body}`
        );
    }

    check(res, {
        "video test status successful": (r) => r.status === 200,
    });

    trackMetrics(res, videoTestMetrics);
}
