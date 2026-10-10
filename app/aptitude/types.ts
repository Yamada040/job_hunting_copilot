import type { AptitudeAnswers } from "@/lib/api/assessments";

/** 適性診断の回答。項目は backend/api/openapi.yaml の AptitudeAnswers で決まる。 */
export type Answers = AptitudeAnswers;
