import { Trend, Counter, Rate } from "k6/metrics";

// Predefined metrics for each API
export const scanDocumentMetrics = {
    requestDuration: new Trend("scanDocument_request_duration", true),
    successfulRequests: new Counter("scanDocument_successful_requests"),
    failedRequests: new Counter("scanDocument_failed_requests"),
    responseSize: new Trend("scanDocument_response_size", true),
    errorRate: new Rate("scanDocument_error_rate"),
};

export const microphoneTestMetrics = {
    requestDuration: new Trend("microphoneTest_request_duration", true),
    successfulRequests: new Counter("microphoneTest_successful_requests"),
    failedRequests: new Counter("microphoneTest_failed_requests"),
    responseSize: new Trend("microphoneTest_response_size", true),
    errorRate: new Rate("microphoneTest_error_rate"),
};

export const videoTestMetrics = {
    requestDuration: new Trend("videoTest_request_duration", true),
    successfulRequests: new Counter("videoTest_successful_requests"),
    failedRequests: new Counter("videoTest_failed_requests"),
    responseSize: new Trend("videoTest_response_size", true),
    errorRate: new Rate("videoTest_error_rate"),
};

export const screenViolationMetrics = {
    requestDuration: new Trend("screenViolation_request_duration", true),
    successfulRequests: new Counter("screenViolation_successful_requests"),
    failedRequests: new Counter("screenViolation_failed_requests"),
    responseSize: new Trend("screenViolation_response_size", true),
    errorRate: new Rate("screenViolation_error_rate"),
};

// Function to track request metrics
export function trackMetrics(res, metrics) {
    if (res.body && res.body.length) {
        metrics.responseSize.add(res.body.length);
    } else {
        console.warn(
            "Response body is empty or undefined. Skipping response size tracking."
        );
    }

    metrics.requestDuration.add(res.timings.duration);

    if (res.status === 200) {
        metrics.successfulRequests.add(1);
    } else if (res.status === 401) {
        console.log("❌ Token has expired (401 Unauthorized). Please refresh.");
    } else {
        metrics.failedRequests.add(1);
        metrics.errorRate.add(1);
        console.error(`Request failed with status: ${res.status}`);
        if (res.body) {
            console.error(`Response Body: ${res.body}`);
        } else {
            console.error("Response body is empty.");
        }
    }
}
