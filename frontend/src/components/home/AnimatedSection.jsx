import { motion as Motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const fadeVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AnimatedSection({
  children,
  className = "",
  delay = 0,
  amount = 0.2,
  once = false,
  x = 0,
  y = 28,
}) {
  const prefersReducedMotion = useReducedMotion();
  const [ref, inView] = useInView({ threshold: amount, triggerOnce: once });

  return (
    <Motion.section
      ref={ref}
      initial={prefersReducedMotion ? false : { opacity: 0, x, y }}
      animate={
        prefersReducedMotion
          ? { opacity: 1, x: 0, y: 0 }
          : inView
            ? { opacity: 1, x: 0, y: 0 }
            : { opacity: 0, x, y }
      }
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Motion.section>
  );
}

export function MotionStagger({
  children,
  className = "",
  amount = 0.15,
  once = false,
  stagger = 0.08,
}) {
  const prefersReducedMotion = useReducedMotion();
  const [ref, inView] = useInView({ threshold: amount, triggerOnce: once });

  return (
    <Motion.div
      ref={ref}
      className={className}
      initial={prefersReducedMotion ? false : "hidden"}
      animate={prefersReducedMotion ? "visible" : inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {children}
    </Motion.div>
  );
}

export function MotionItem({ children, className = "" }) {
  return (
    <Motion.div className={className} variants={fadeVariants}>
      {children}
    </Motion.div>
  );
}
