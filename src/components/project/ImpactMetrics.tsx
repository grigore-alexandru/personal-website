import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ImpactMetric } from '../../types';
import { designTokens } from '../../styles/tokens';
import AnimatedNumber from '../AnimatedNumber';

interface ImpactMetricsProps {
  metrics: ImpactMetric[];
}

function parseMetricToNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  if (cleaned.toUpperCase().endsWith('M')) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.toUpperCase().endsWith('K')) return parseFloat(cleaned) * 1_000;
  if (!isNaN(Number(cleaned))) return Number(cleaned);
  return null;
}

function formatMetricNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

const ImpactMetrics: React.FC<ImpactMetricsProps> = ({ metrics }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!metrics.length) return null;

  return (
    <section ref={sectionRef} className="py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div
          className="flex flex-wrap justify-center gap-12 md:gap-20"
          style={{ justifyContent: metrics.length < 3 ? 'center' : undefined }}
        >
          {metrics.map((metric, i) => {
            const numericValue = parseMetricToNumber(metric.value);
            const isNumeric = numericValue !== null;

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 24 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.6, ease: 'easeOut' }}
                className="flex flex-col items-center text-center min-w-[140px]"
              >
                <span
                  className="uppercase tracking-wider mb-3"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontSize: designTokens.typography.sizes.xs,
                    fontWeight: designTokens.typography.weights.regular,
                    letterSpacing: designTokens.typography.letterSpacings.wide,
                    color: designTokens.colors.textSecondary,
                  }}
                >
                  {metric.label}
                </span>
                {isNumeric && isVisible ? (
                  <AnimatedNumber
                    value={numericValue}
                    format={formatMetricNumber}
                    duration={1800}
                    className="text-4xl md:text-5xl font-bold"
                    style={{
                      fontFamily: designTokens.typography.fontFamily,
                      fontWeight: designTokens.typography.weights.bold,
                      color: designTokens.colors.textPrimary,
                    }}
                  />
                ) : isNumeric ? (
                  <span
                    className="text-4xl md:text-5xl font-bold"
                    style={{
                      fontFamily: designTokens.typography.fontFamily,
                      fontWeight: designTokens.typography.weights.bold,
                      color: designTokens.colors.textPrimary,
                    }}
                  >
                    0
                  </span>
                ) : (
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
                    className="text-2xl md:text-3xl font-bold"
                    style={{
                      fontFamily: designTokens.typography.fontFamily,
                      fontWeight: designTokens.typography.weights.bold,
                      color: designTokens.colors.textPrimary,
                    }}
                  >
                    {metric.value}
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ImpactMetrics;
