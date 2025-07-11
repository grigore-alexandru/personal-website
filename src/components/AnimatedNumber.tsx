import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number; // in ms
  className?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  duration = 1500,
  className
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const initial = displayValue;

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const current = initial + (value - initial) * progress;
      setDisplayValue(current);

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };

    raf.current = requestAnimationFrame(animate);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className={className}>{format(displayValue)}</span>;
};

export default AnimatedNumber;