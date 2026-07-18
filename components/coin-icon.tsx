import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * An asset logo with the atmospheric colored halo drawn from its own image (a
 * blurred, scaled copy of the same cached src — see `.coin-ic-halo` in
 * globals.css, which lifts on hover inside a `group`).
 *
 * The single source of truth for every coin/token icon in the app, so the glow
 * is identical everywhere and a new render site can't silently miss it. Style
 * the wrapper (margins, ring) via `className`; the image itself stays a round,
 * haloed avatar of `size` px.
 */
export const CoinIcon = ({
  src,
  size = 24,
  alt = "",
  className,
  imageClassName,
}: {
  src: string;
  size?: number;
  alt?: string;
  className?: string;
  /** Extra classes on the image itself (e.g. a ring for overlapping stacks). */
  imageClassName?: string;
}): React.ReactNode => (
  <span
    className={cn("relative inline-flex shrink-0", className)}
    style={{ width: size, height: size }}
  >
    <span
      aria-hidden="true"
      className="coin-ic-halo"
      style={{ backgroundImage: `url(${src})` }}
    />
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("relative z-10 rounded-full", imageClassName)}
    />
  </span>
);
