import { z } from "zod";

import {
  checkboxBoolean,
  optionalNonNegativeNumber,
  optionalNumber,
  optionalString,
  optionalTrimmedString,
  requiredTrimmedString,
} from "@/lib/validation";

export const companyFormSchema = z.object({
  name: requiredTrimmedString,
  industry: optionalTrimmedString,
  url: optionalTrimmedString,
  mypage_id: optionalTrimmedString,
  mypage_url: optionalTrimmedString,
  memo: optionalTrimmedString,
  stage: optionalTrimmedString,
  preference: optionalNumber,
  favorite: checkboxBoolean,
});

export const esQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().optional(),
  answer_md: z.string().optional(),
});

export const esQuestionsSchema = z.array(esQuestionSchema);

export const esFormSchema = z.object({
  company_name: optionalTrimmedString,
  selection_status: optionalTrimmedString,
  company_url: optionalTrimmedString,
  memo: optionalTrimmedString,
  deadline: optionalTrimmedString,
  title: requiredTrimmedString,
  content_md: optionalString.default(""),
  tags: optionalString.default(""),
  questions_json: optionalString,
  intent: optionalString.default("save"),
});

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
