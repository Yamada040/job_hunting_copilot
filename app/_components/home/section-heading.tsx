"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { fadeInUp, homeHeading } from "./theme";

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
};

export function SectionHeading({ title, eyebrow, description }: Props) {
  return (
    <motion.div {...fadeInUp} className="space-y-3 text-center">
      <div className="mx-auto h-1 w-28 rounded-full bg-linear-to-r from-transparent via-[#b8844a] to-transparent" />
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{eyebrow}</p>}
      <h2 className={cn("text-3xl font-bold", homeHeading)}>{title}</h2>
      {description && <p className="mx-auto max-w-2xl text-lg text-slate-600">{description}</p>}
    </motion.div>
  );
}
