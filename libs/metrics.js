import { Trend, Counter, Rate } from "k6/metrics";

export const apiFailures = new Counter("api_failures");

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

export const proctorTestMetrics = {
    requestDuration: new Trend("proctorTest_request_duration", true),
    successfulRequests: new Counter("proctorTest_successful_requests"),
    failedRequests: new Counter("proctorTest_failed_requests"),
    responseSize: new Trend("proctorTest_response_size", true),
    errorRate: new Rate("proctorTest_error_rate"),
};

// Function to track request metrics
export function trackMetrics(res, metrics, functionName) {
    metrics.requestDuration.add(res.timings.duration);

    if (res.body && res.body.length) {
        metrics.responseSize.add(res.body.length);
    }

    // Check if request body is missing (Potential QA issue)
    if (!res.request.body || Object.keys(res.request.body).length === 0) {
        console.warn(
            `[${functionName}] ⚠️ Script issue!!! Request body is missing.`
        );
    }

    if (res.status === 200) {
        metrics.successfulRequests.add(1);
    } else if (res.status === 401) {
        throw new Error(
            ` [${functionName}] ⚠️ Authentication failed. Token has expired (401 Unauthorized). Please refresh.`
        );
    } else if (res.status === 504) {
        console.error(
            ` [${functionName}] VU ${__VU} ⏳ 504 Gateway Timeout error occurred.`
        );
    } else {
        metrics.failedRequests.add(1);
        metrics.errorRate.add(1);

        console.error(`[${functionName}] ❌ API Error:`);
        console.error(`🔹 Status: ${res.status}`);
        console.error(`🔹 Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.error(
            `🔹 Response Body: ${
                res.body ? res.body.substring(0, 500) : "Empty"
            }`
        );

        // Log full request details for debugging
        console.error(`🔹 Request URL: ${res.request.url}`);
        console.error(`🔹 Request Method: ${res.request.method}`);

        if (res.request.body) {
            console.error(
                `🔹 Request Body: ${
                    typeof res.request.body === "string"
                        ? res.request.body.substring(0, 500)
                        : "[Non-String Data]"
                }`
            );
        } else {
            console.error("🔹 Request Body: Empty or Undefined");
        }
    }
}
