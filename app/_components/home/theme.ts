/** ホームのカードの配色。白い面と、淡い空色の面の2種類 */
export const homeCard = "text-slate-600";
export const homeCardMuted = "bg-sky-50 text-slate-600";
export const homeHeading = "text-slate-900";
export const homeAccent = "text-sky-600";
export const homeIconBox = "border border-sky-200 bg-sky-50 text-sky-600";

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
