import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TOKEN, ID_TOKEN, ORIGIN } from "../libs/config.js";
import { trackMetrics, microphoneTestMetrics } from "../libs/metrics.js";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";

// Load the audio file in the global scope
const audioFile = open("../data/sample_audio.wav", "b");

const audioThresholdScore = 80;
const sampleSpeech = encodeURIComponent(
    "This is audio recording test for proctoring exam. The proctored exam is being conducted through fuse classroom platform. And I there by abide to the rules of proctored exam which is going to start now."
);

export function microphoneTest() {
    const fd = new FormData();
    fd.append("files", http.file(audioFile, "sample_audio.wav", "audio/x-wav"));

    let headers = {
        Authorization: TOKEN,
        idToken: ID_TOKEN,
        Origin: ORIGIN,
        "Content-Type": "multipart/form-data; boundary=" + fd.boundary,
    };

    let url = `${BASE_URL}/api/proctor/meetings/677f8035b9c56a4f0c627763/proctor-validator?finalCall=false&fileType=audio&sampleSpeech=${sampleSpeech}&audioThresholdScore=${audioThresholdScore}`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: { api: "microphoneTest" },
        timeout: "120s",
    });

    let jsonResponse;
    try {
        jsonResponse = res.json();
    } catch (error) {
        console.error(
            `Failed to parse JSON response in Microphone Test: ${res.body}`
        );
    }

    check(res, {
        "microphone test successful": () => res.status === 200,
    });

    trackMetrics(res, microphoneTestMetrics);
}
