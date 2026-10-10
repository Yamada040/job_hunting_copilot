import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    // Vitestのデフォルトglobは *.spec.ts も拾うため、PlaywrightのE2E仕様ファイル
    // (e2e/**/*.spec.ts) を除外し、単体テスト(*.test.ts)のみを対象にする。
    // exclude はVitestの既定値を上書きしてしまうため、node_modules等の既定除外パターンも明示する。
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.claude/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/**/_components/**/*.ts"],
      exclude: ["lib/api/schema.d.ts", "**/*.test.ts"],
    },
  },
});
