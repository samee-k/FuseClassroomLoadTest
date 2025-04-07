import http from "k6/http";
import { check } from "k6";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";
import { BASE_URL, ORIGIN } from "../libs/config.js";
import { proctorTestMetrics, trackMetrics } from "../libs/metrics.js";

// Load multiple files in binary mode
const proctorAudio = open("../data/proctoringApiData/proctorAudio.wav", "b");
const proctorVideo = open("../data/proctoringApiData/proctorVideo.webm", "b");
const screenRecFile = open("../data/face_right.jpeg", "b");

export function proctorTest(token, id_token, quizId) {
    let fd = new FormData();

    fd.append(
        "files",
        http.file(proctorAudio, "proctorAudio.wav", "audio/wav")
    );
    fd.append(
        "files",
        http.file(proctorVideo, "proctorVideo.webm", "video/webm")
    );
    fd.append(
        "screenRecFile",
        http.file(screenRecFile, "proctorVideo.webm", "video/webm")
    );

    let headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": `multipart/form-data; boundary=${fd.boundary}`,
    };

    let url = `${BASE_URL}/api/proctor/meetings/${quizId}/proctor`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: {
            api: "proctoring-test",
            method: "POST",
            target: "/api/proctor/meetings/proctor",
        },
        timeout: "120s",
    });

    check(res, {
        "Proctoring test successful": (r) => r.status === 200,
    });

    trackMetrics(res, proctorTestMetrics, "proctorTestApi");

    return res;
}
