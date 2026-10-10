import { z } from "zod";

import { optionalNonNegativeNumber, optionalString, requiredTrimmedString } from "@/lib/validation";

export const webtestQuestionFormSchema = z.object({
  title: requiredTrimmedString,
  body: requiredTrimmedString,
  answer: requiredTrimmedString,
  choices: optionalString,
  test_type: optionalString,
  explanation: optionalString,
  category: optionalString,
  format: optionalString,
  difficulty: optionalString,
  time_limit: optionalNonNegativeNumber,
});

export const webtestAnswerFormSchema = z.object({
  answer: optionalString.default(""),
  time_spent: optionalNonNegativeNumber,
});
