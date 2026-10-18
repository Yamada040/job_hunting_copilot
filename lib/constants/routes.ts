/** 企業の詳細の画面で、AI企業分析の欄を開いて見せるための目印 */
export const COMPANY_ANALYSIS_ANCHOR = "ai-analysis";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  DEVELOPER: "/developer",
  PROFILE: "/profile",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/terms",

  // 企業関連
  COMPANIES: "/companies",
  COMPANIES_NEW: "/companies/new",
  COMPANY_DETAIL: (id: string) => `/companies/${id}`,
  COMPANY_ANALYSIS: (id: string) => `/companies/${id}#${COMPANY_ANALYSIS_ANCHOR}`,

  // ES関連
  ES: "/es",
  ES_NEW: "/es/new",
  ES_DETAIL: (id: string) => `/es/${id}`,

  // 面接関連
  INTERVIEWS: "/interviews",
  INTERVIEWS_NEW: "/interviews/new",
  INTERVIEW_DETAIL: (id: string) => `/interviews/${id}`,

  // Webテスト関連
  WEBTESTS: "/webtests",
  WEBTESTS_NEW: "/webtests/new",
  WEBTEST_DETAIL: (id: string) => `/webtests/${id}`,
  WEBTEST_EDIT: (id: string) => `/webtests/${id}/edit`,

  // その他
  CALENDAR: "/calendar",
  SELF_ANALYSIS: "/self-analysis",
  APTITUDE: "/aptitude",
} as const;

/**
 * ログインしていなくても開ける画面。ログインしていないときは、ログイン後の画面のヘッダー（レベル・XP）と下のメニューを出さない。
 * 問い合わせは、ログインできなくて困っている人も使えるよう、ここに入れる
 */
export const PUBLIC_PAGES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.CONTACT,
];

/**
 * 自分で枠（ロゴや戻るリンク）を描く画面。ログインしていても、ログイン後の画面のヘッダーと下のメニューを出さない。
 * 問い合わせはここに入れない（ログイン中は、ほかの画面と同じヘッダーと下のメニューで使えるように）
 */
export const STANDALONE_PAGES: readonly string[] = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.PRIVACY, ROUTES.TERMS];
