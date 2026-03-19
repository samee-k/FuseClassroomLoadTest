import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../../libs/config.js";
import { apiFailures } from "../../libs/metrics.js";

export function fetchQuiz(token, id_token) {
    const url = `${BASE_URL}/api/v2/students/quiz?batchIds=&courseIds=&quizAttemptType=&quizType=EXAM&page=1&size=10`;

    const headers = {
        Authorization: token,
        idToken: id_token,
        Origin: ORIGIN,
        "Content-Type": "application/json",
    };

    const res = http.get(url, {
        headers: headers,
        tags: { api: "quiz", method: "GET", target: "api/v2/students/quiz" },
        timeout: "120s",
    });

    const success = check(res, {
        "Get quizes successful": (r) => r.status === 200,
    });

    if (!success) {
        console.error("[fetchQuiz] Quiz fetch failed:");
        console.error(`Status: ${res.status}`);
        console.error(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.error(`Body: ${res.body ? res.body.substring(0, 1000) : "Empty"}`);
        apiFailures.add(1, { api: "get-quiz" });
        return null;
    }

    const responseBody = res.json();
    if (!responseBody?.content?.length) {
        console.warn("No quizzes found. Full response:");
        console.warn(JSON.stringify(responseBody, null, 2));
        return null;
    }

    const quizList = responseBody.content;
    const allowedQuiz = quizList.find((quiz) => quiz.allowQuiz === true);
    const notAttemptedQuiz = quizList.find(
        (quiz) => quiz.quizAttemptType === "NOT_ATTEMPTED" && !quiz.complete
    );
    const selectedQuiz = allowedQuiz || notAttemptedQuiz || quizList[0];

    if (!selectedQuiz?.quizId) {
        return null;
    }

    if (!selectedQuiz.allowQuiz) {
        console.warn(
            `[fetchQuiz] Using quizId ${selectedQuiz.quizId} even though allowQuiz=false. This can happen before pre-check flow finishes in UI.`
        );
    }

    return selectedQuiz.quizId;
}
