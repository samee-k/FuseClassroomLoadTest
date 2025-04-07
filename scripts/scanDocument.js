import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../libs/config.js";
import { trackMetrics, scanDocumentMetrics } from "../libs/metrics.js";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";

// Load the file once globally in binary mode.
const imageFile = open("../data/sample_image.png", "b");

export function scanDocument(token, id_token) {
    if (__VU === 1) {
        console.log("Scanning document test started...");
    }

    const fd = new FormData();
    fd.append("file", http.file(imageFile, "sample_image.png", "image/jpeg"));

    const headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": "multipart/form-data; boundary=" + fd.boundary,
    };

    const url = `${BASE_URL}/api/proctor/meetings/67eccca23c4b375e17d5cc10/doc-validator`;

    const res = http.post(url, fd.body(), {
        headers: headers,
        tags: {
            api: "scan-document",
            method: "POST",
            target: "/api/proctor/meetings/doc-validator",
        },
        timeout: "120s",
    });

    check(res, {
        "Scan document successful": (r) => r.status === 200,
    });

    trackMetrics(res, scanDocumentMetrics, "scanDocumentAPI");

    return res;
}
