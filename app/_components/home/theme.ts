/** ホームのカードの配色。白い面と、淡い空色の面の2種類 */
export const homeCard = "text-muted-foreground";
export const homeCardMuted = "bg-secondary text-muted-foreground";
export const homeHeading = "text-foreground";
export const homeAccent = "text-primary";

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
