"use client";

import { motion } from "framer-motion";

interface AnimatedEditorialTextProps {
  text: string;
  className?: string;
  /** Unique key to replay animation when content changes. */
  animationKey: string;
  /** Disable word stagger during background refresh. */
  animate?: boolean;
}

export function AnimatedEditorialText({
  text,
  className,
  animationKey,
  animate = true,
}: AnimatedEditorialTextProps) {
  if (!animate) {
    return <p className={className}>{text}</p>;
  }

  const words = text.split(/(\s+)/);

  return (
    <motion.p
      key={animationKey}
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.018 } },
      }}
    >
      {words.map((segment, i) =>
        /^\s+$/.test(segment) ? (
          <span key={`${animationKey}-sp-${i}`}>{segment}</span>
        ) : (
          <motion.span
            key={`${animationKey}-w-${i}`}
            variants={{
              hidden: { opacity: 0, y: 4 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            style={{ display: "inline-block" }}
          >
            {segment}
          </motion.span>
        )
      )}
    </motion.p>
  );
}
