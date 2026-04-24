import { useState } from "react";
import { motion as Motion } from "framer-motion";

export function RippleButton({
  children,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = {
      id: Date.now() + Math.random(),
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
      size,
    };

    setRipples((current) => [...current, ripple]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 650);

    onClick?.(event);
  };

  return (
    <Motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className={`relative isolate overflow-hidden ${className}`}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/35 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
      <span className="relative z-[1]">{children}</span>
    </Motion.button>
  );
}
