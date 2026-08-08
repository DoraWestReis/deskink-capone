import React, { useEffect, useState } from 'react';

export default function AnimatedNumber({ value, format }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame;
    const animate = (time) => {
      const progress = Math.min((time - start) / 800, 1);
      setDisplay(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return format(display);
}