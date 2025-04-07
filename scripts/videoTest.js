import http from "k6/http";
import { check } from "k6";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";
import { BASE_URL, ORIGIN } from "../libs/config.js";
import { trackMetrics, videoTestMetrics } from "../libs/metrics.js";

// Load multiple files in binary mode
const faceFront = open("../data/face_front.jpeg", "b");
const faceLeft = open("../data/face_left.jpeg", "b");
const faceRight = open("../data/face_right.jpeg", "b");

// Check if files loaded correctly
if (!faceFront || !faceLeft || !faceRight) {
    throw new Error("❌ One or more files could not be loaded!");
}

export function videoTest(token, id_token, quizId) {
    let fd = new FormData();

    fd.append("files", http.file(faceFront, "face_front.jpeg", "image/jpeg"));
    fd.append("files", http.file(faceLeft, "face_left.jpeg", "image/jpeg"));
    fd.append("files", http.file(faceRight, "face_right.jpeg", "image/jpeg"));

    let headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": `multipart/form-data; boundary=${fd.boundary}`,
    };

    let url = `${BASE_URL}/api/proctor/meetings/${quizId}/proctor-validator?finalCall=true&fileType=image`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: {
            api: "video-test",
            method: "POST",
            target: "/api/proctor/meetings/",
        },
        timeout: "120s",
    });

    check(res, {
        "Video test successful": (r) => r.status === 200,
    });

    trackMetrics(res, videoTestMetrics, "videoTestAPI");

    return res;
}
