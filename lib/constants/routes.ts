export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  DEVELOPER: "/developer",
  PROFILE: "/profile",
  CONTACT: "/contact",

  // 企業関連
  COMPANIES: "/companies",
  COMPANIES_NEW: "/companies/new",
  COMPANY_DETAIL: (id: string) => `/companies/${id}`,

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

  // その他
  CALENDAR: "/calendar",
  SELF_ANALYSIS: "/self-analysis",
  APTITUDE: "/aptitude",
} as const;
