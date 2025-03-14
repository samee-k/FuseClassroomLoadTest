import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TOKEN, ID_TOKEN, ORIGIN } from "../libs/config.js";
import { trackMetrics, scanDocumentMetrics } from "../libs/metrics.js";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";

// Load the file once globally in binary mode.
const imageFile = open("../data/sample_image.png", "b");
const meetingIds = "62ad8f8aff41e2290109cddf";

export function scanDocument() {
    const fd = new FormData();
    fd.append("file", http.file(imageFile, "sample_image.png", "image/png"));

    let headers = {
        Authorization: TOKEN,
        idToken: ID_TOKEN,
        Origin: ORIGIN,
        "Content-Type": "multipart/form-data; boundary=" + fd.boundary,
    };

    let url = `${BASE_URL}/api/proctor/meetings/${meetingIds}/doc-validator`;

    let res = http.post(url, fd.body(), {
        headers: headers,
        tags: { api: "scanDocument" },
        timeout: "120s",
    });

    check(res, {
        "scan document successful": (r) => r.status === 200,
    });

    trackMetrics(res, scanDocumentMetrics);
}
