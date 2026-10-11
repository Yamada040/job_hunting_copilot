/** ホームだけの羊皮紙風の配色。Card の空色の枠と白い面を、茶色の枠と羊皮紙の面に差し替える */
export const parchmentCard = "bg-[#f8e7c8] text-[#6f4b25] ring-[#b8844a] shadow-[0_8px_28px_rgba(116,64,0,0.12)]";
export const parchmentCardDeep = "bg-[#f3ddb8] text-[#6f4b25] ring-[#b8844a] shadow-[0_8px_30px_rgba(116,64,0,0.14)]";
export const parchmentHeading = "text-[#412c18]";
export const parchmentAccent = "text-[#9a4f00]";
export const parchmentIconBox = "border border-[#b8844a] bg-[#f2dbb4] text-[#9a4f00]";

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
