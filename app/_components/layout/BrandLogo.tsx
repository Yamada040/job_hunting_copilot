import Image from "next/image";
import { clsx } from "clsx";

type BrandLogoProps = {
  className?: string;
  logoClassName?: string;
};

export function BrandLogo({ className, logoClassName }: BrandLogoProps) {
  return (
    <div className={clsx("flex items-center", className)}>
      <Image
        src="/brand-logo.svg"
        alt="就活copilot"
        width={938}
        height={352}
        className={clsx("h-10 w-auto", logoClassName)}
        priority
      />
    </div>
  );
}
