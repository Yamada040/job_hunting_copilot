import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  logoClassName?: string;
};

export function BrandLogo({ className, logoClassName }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/brand-logo.svg"
        alt="就活copilot"
        width={938}
        height={352}
        className={cn("h-10 w-auto", logoClassName)}
        priority
      />
    </div>
  );
}
