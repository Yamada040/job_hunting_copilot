import type { z } from "zod";

/**
 * zod の z.object に渡すフィールドを、openapi.yaml から生成した型 T に縛る。`satisfies SchemaShape<T>` で使う。
 * Required<T> で任意の項目もキーとして必須にし、生成型に増えた項目を書き忘れるとコンパイルエラーにする
 * （z.object は書かれていないキーを黙って捨てるので、書き忘れた項目は送られずに消える）。
 */
export type SchemaShape<T> = { [K in keyof Required<T>]: z.ZodType<T[K]> };
