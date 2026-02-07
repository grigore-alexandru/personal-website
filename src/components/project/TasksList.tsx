import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../../styles/tokens';

interface TasksListProps {
  tasks: string[];
}

const TasksList: React.FC<TasksListProps> = ({ tasks }) => {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!tasks.length) return null;

  return (
    <div ref={sectionRef}>
      <ul className="space-y-4">
        {tasks.map((task, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{
              delay: i * 0.08,
              duration: 0.5,
              ease: 'easeOut',
            }}
            className="flex items-start gap-4"
          >
            <span
              className="mt-[7px] w-2 h-2 rounded-full bg-black flex-shrink-0"
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.sm,
                fontWeight: designTokens.typography.weights.regular,
                lineHeight: designTokens.typography.lineHeights.body,
                color: 'rgb(55, 65, 81)',
              }}
            >
              {task}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default TasksList;
