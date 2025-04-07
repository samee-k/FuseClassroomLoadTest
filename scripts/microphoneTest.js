import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../libs/config.js";
import { trackMetrics, microphoneTestMetrics } from "../libs/metrics.js";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";

// Load the audio file in the global scope
const audioFile = open("../data/sample_audio.wav", "b");

const audioThresholdScore = 80;
const sampleSpeech = encodeURIComponent(
    "This is audio recording test for proctoring exam. The proctored exam is being conducted through fuse classroom platform. And I there by abide to the rules of proctored exam which is going to start now."
);

// export function microphoneTest(token, id_token, quizId) {
export function microphoneTest(token, id_token, quizId) {
    const fd = new FormData();
    fd.append("files", http.file(audioFile, "sample_audio.wav", "audio/x-wav"));

    let headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": `multipart/form-data; boundary=${fd.boundary}`,
    };

    let url = `${BASE_URL}/api/proctor/meetings/${quizId}/proctor-validator?finalCall=false&fileType=audio&sampleSpeech=${sampleSpeech}&audioThresholdScore=${audioThresholdScore}`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: {
            api: "microphone-test",
            method: "POST",
            target: "/api/proctor/meetings/proctor-validator",
        },
        timeout: "120s",
    });

    check(res, {
        "Microphone test successful": () => res.status === 200,
    });

    trackMetrics(res, microphoneTestMetrics, "microphoneAPI");

    return res;
}
