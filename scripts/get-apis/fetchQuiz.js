import http from "k6/http";
import { check } from "k6";
import { BASE_URL, ORIGIN } from "../../libs/config.js";

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
    });

    const success = check(res, {
        "Get quizes successful": (r) => r.status === 200,
    });

    if (!success) {
        apiFailures.add(1, { api: "get-quiz" });
        return null;
    }

    const responseBody = res.json();
    if (!responseBody?.content?.length) {
        console.warn("No quizzes found");
        return null;
    }

    return (
        responseBody.content.find((quiz) => quiz.allowQuiz === true)?.quizId ||
        null
    );
}
