"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { fadeInUp, homeHeading } from "./theme";

type Props = {
  /** セクションの言いたいことを短い一文で。「。」ごとに区切り、その途中では折り返さない */
  title: string;
  description?: string;
};

export function SectionHeading({ title, description }: Props) {
  const sentences = title.split(/(?<=。)/);
  return (
    <motion.div {...fadeInUp} className="space-y-3 text-center">
      <h2 className={cn("text-3xl leading-tight font-black tracking-tight sm:text-5xl depth:text-6xl", homeHeading)}>
        {sentences.map((sentence) => (
          <span key={sentence} className="inline-block">
            {sentence}
          </span>
        ))}
      </h2>
      {description && <p className="mx-auto max-w-2xl text-base text-muted-foreground">{description}</p>}
    </motion.div>
  );
}
