import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { designTokens } from '../styles/tokens';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: 'bottom' | 'left' | 'right';
}> = ({ children, delay = 0, className = '', from = 'bottom' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });

  const initial = {
    opacity: 0,
    y: from === 'bottom' ? 40 : 0,
    x: from === 'left' ? -40 : from === 'right' ? 40 : 0,
  };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Chapter label ────────────────────────────────────────────────────────────

const ChapterLabel: React.FC<{ number: string; title: string }> = ({ number, title }) => (
  <FadeIn>
    <div className="flex items-center gap-4 mb-10">
      <span
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{ color: designTokens.colors.semantic.textMuted }}
      >
        Chapter {number}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: designTokens.colors.semantic.borderDefault }}
      />
      <span
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{ color: designTokens.colors.semantic.textMuted }}
      >
        {title}
      </span>
    </div>
  </FadeIn>
);

// ─── Pull-quote ───────────────────────────────────────────────────────────────

const PullQuote: React.FC<{ children: React.ReactNode; accent?: 'blue' | 'pink' }> = ({
  children,
  accent = 'blue',
}) => {
  const color = accent === 'blue' ? designTokens.colors.primary[500] : '#ec4899';
  return (
    <FadeIn delay={0.15}>
      <blockquote
        className="my-16 pl-8 md:pl-12"
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <p
          className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            color: designTokens.colors.semantic.textPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          {children}
        </p>
      </blockquote>
    </FadeIn>
  );
};

// ─── Body paragraph ───────────────────────────────────────────────────────────

const BodyText: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => (
  <FadeIn delay={delay}>
    <p
      className="leading-[1.9] mb-6"
      style={{
        fontFamily: designTokens.typography.fontFamily,
        fontSize: '18px',
        fontWeight: designTokens.typography.weights.regular,
        color: '#475569',
      }}
    >
      {children}
    </p>
  </FadeIn>
);

// ─── Full-bleed accent band ───────────────────────────────────────────────────

const AccentBand: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({
  children,
  dark = false,
}) => (
  <FadeIn>
    <div
      className="my-20 -mx-6 md:-mx-12 lg:-mx-20 px-6 md:px-12 lg:px-20 py-16 md:py-20 rounded-[2rem]"
      style={{
        background: dark ? '#0f172a' : designTokens.colors.semantic.surfaceSunken,
      }}
    >
      {children}
    </div>
  </FadeIn>
);

// ─── Animated stat / milestone ────────────────────────────────────────────────

const Milestone: React.FC<{ age: string; label: string; delay?: number }> = ({
  age,
  label,
  delay = 0,
}) => (
  <FadeIn delay={delay}>
    <div className="flex flex-col items-center text-center px-4">
      <span
        className="text-5xl md:text-6xl font-extrabold mb-2"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          color: designTokens.colors.primary[500],
          letterSpacing: '-0.03em',
        }}
      >
        {age}
      </span>
      <span
        className="text-sm font-medium tracking-wide uppercase"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          color: designTokens.colors.semantic.textSecondary,
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
    </div>
  </FadeIn>
);

// ─── Horizontal divider with accent dot ──────────────────────────────────────

const Divider: React.FC = () => (
  <div className="flex items-center justify-center my-20 gap-4">
    <div className="h-px w-16 md:w-24" style={{ background: designTokens.colors.semantic.borderDefault }} />
    <div
      className="w-2 h-2 rounded-full"
      style={{ background: designTokens.colors.primary[500] }}
    />
    <div
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: '#ec4899' }}
    />
    <div
      className="w-2 h-2 rounded-full"
      style={{ background: designTokens.colors.primary[500] }}
    />
    <div className="h-px w-16 md:w-24" style={{ background: designTokens.colors.semantic.borderDefault }} />
  </div>
);

// ─── Cinematic title block ────────────────────────────────────────────────────

const HeroSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div ref={ref} className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background blobs */}
      <motion.div
        style={{ y }}
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full"
        animate={{
          background: [
            'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
            'radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)',
            'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -80]) }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full"
        animate={{
          background: [
            'radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)',
            'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
            'radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8 text-xs font-bold tracking-[0.3em] uppercase"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            color: designTokens.colors.primary[500],
          }}
        >
          A Story of Light Through Concrete
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-extrabold mb-8"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#0f172a',
          }}
        >
          From a Broken{' '}
          <span
            className="relative inline-block"
            style={{ color: designTokens.colors.primary[500] }}
          >
            Crane
            <svg
              className="absolute w-full -bottom-2 left-0"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              style={{ height: '6px' }}
            >
              <path
                d="M0 6 Q 50 0 100 6"
                stroke="#ec4899"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <br />
          to a Colorful{' '}
          <span style={{ color: '#ec4899' }}>World</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="max-w-xl mx-auto text-lg md:text-xl leading-relaxed"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            color: '#64748b',
          }}
        >
          A personal account of growing up between rusted machinery and building blocks —
          and finding, against all odds, a world of beauty within it.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-12"
            style={{ background: 'linear-gradient(to bottom, transparent, #3b82f6, transparent)' }}
          />
          <span
            className="text-xs tracking-[0.2em] uppercase"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              color: designTokens.colors.semantic.textMuted,
            }}
          >
            Scroll
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ─── Timeline milestones ──────────────────────────────────────────────────────

const EarlyYears: React.FC = () => (
  <section className="py-8">
    <div
      className="p-8 md:p-12 rounded-[2rem]"
      style={{ background: '#f8fafc', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)' }}
    >
      <FadeIn>
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase mb-8"
          style={{ color: designTokens.colors.primary[500], fontFamily: designTokens.typography.fontFamily }}
        >
          The Early Years
        </p>
      </FadeIn>
      <div className="grid grid-cols-3 gap-4 md:gap-8">
        <Milestone age="2" label="Father works 100 km from home" delay={0.05} />
        <Milestone age="3" label="Living in the construction site" delay={0.15} />
        <Milestone age="6" label="The first real home" delay={0.25} />
      </div>
    </div>
  </section>
);

// ─── Main page component ──────────────────────────────────────────────────────

const StoryPage: React.FC = () => {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: designTokens.typography.fontFamily }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 md:px-8 pb-32">

        {/* Chapter I */}
        <ChapterLabel number="I" title="The Dark Hall" />

        <BodyText>
          I remember being in a long, dark hall, full of doors on both sides. I was at a
          construction site — the place I lived in. All of a sudden, a door opens, revealing a
          yellow-lighted room. There are my parents, old and tired, sitting still.
        </BodyText>

        <PullQuote accent="blue">
          My steps sound like the ticking of a clock, as with each second that passes, they fight
          more to go beyond their condition.
        </PullQuote>

        <EarlyYears />

        <BodyText delay={0.1}>
          At two, my father worked a hundred kilometres from home and my mother balanced
          graduate studies alongside her job. When I turned three, we moved into the
          construction site's residence itself — living between rusted machinery and building
          blocks. I had no children to play with; my playground was a broken crane.
        </BodyText>

        <Divider />

        {/* Chapter II */}
        <ChapterLabel number="II" title="The Colored Windows" />

        <BodyText>
          Only when I turned six did something change. After many sacrifices, my family managed
          to secure a property — a clean apartment where sunlight was no longer diffused by
          concrete dust in the air, but by the colored windows I was surrounded by.
        </BodyText>

        <BodyText delay={0.1}>
          But this also marked the moment my parents unconsciously passed an unhealthy torch of
          ambition onto me. My mother became my primary school teacher — and so I felt loved only
          when I was the most performant, both at school and at home.
        </BodyText>

        <AccentBand dark>
          <FadeIn>
            <p
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center leading-tight"
              style={{
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                fontFamily: designTokens.typography.fontFamily,
              }}
            >
              I sat alone at my desk, finishing coursework,{' '}
              <span style={{ color: designTokens.colors.primary[400] }}>
                striving to be the best
              </span>
              . I didn't feel seen. So I sought validation through everything I undertook.
            </p>
          </FadeIn>
        </AccentBand>

        <BodyText>
          Due to a lack of financial security, I became eager to accumulate — money, power,
          recognition. I envisioned rising statues with my name inscribed on them, a title chanted
          by an endless crowd. I wanted to become an important individual.
        </BodyText>

        <Divider />

        {/* Chapter III */}
        <ChapterLabel number="III" title="The Silenced Crown" />

        <BodyText>
          Happily, this illusory crowd was quickly silenced — because I entered high school. There
          I met people as diverse and interesting as stars in the night sky.
        </BodyText>

        <PullQuote accent="pink">
          I looked left and saw colleagues who generated educational movements. I turned right and
          came across peers who sang at the biggest rock scenes in Romania.
        </PullQuote>

        <BodyText delay={0.1}>
          They were truly passionate about life and their pursuits. And so, I became profoundly
          inspired by them — inspired not to chase a crowd, but to listen to the quiet voice inside
          that had been waiting all along.
        </BodyText>

        <Divider />

        {/* Chapter IV */}
        <ChapterLabel number="IV" title="The Unfolding Pages" />

        <BodyText>
          At their recommendation, I started writing my thoughts. Page after page, my past was
          unfolding, unmasking my identity — finally being able to hug the little child who craved
          to be seen.
        </BodyText>

        <AccentBand>
          <FadeIn>
            <p
              className="text-xl md:text-2xl font-bold text-center leading-relaxed"
              style={{
                color: '#0f172a',
                fontFamily: designTokens.typography.fontFamily,
                letterSpacing: '-0.01em',
              }}
            >
              In those moments of self-inquiry, it felt that life no longer graded the{' '}
              <span style={{ color: designTokens.colors.primary[600] }}>quality of my answer</span>{' '}
              — but the{' '}
              <span style={{ color: '#ec4899' }}>significance of the question</span>.
            </p>
          </FadeIn>
        </AccentBand>

        <BodyText>
          This is how I began my journey of self-discovery. I started creating and expressing
          myself through filmmaking — living through all the stories I built.
        </BodyText>

        <Divider />

        {/* Chapter V */}
        <ChapterLabel number="V" title="The World Expanded" />

        <BodyText>
          Moments like running at 5 AM on a snowy field beneath a drone, falling into water while
          filming a chase scene, getting ten thousand euros' worth of equipment rained on — these
          changed me profoundly.
        </BodyText>

        <BodyText delay={0.1}>
          The mistakes I made, the discussions I had with my friends, the diverse perspectives on
          meaning, the unexpected situations — all of it helped me embrace my imperfections.
        </BodyText>

        <PullQuote accent="blue">
          My desire to fully live started to arise. And my childhood dream finally became true.
        </PullQuote>

        {/* Final statement — full cinematic close */}
        <FadeIn delay={0.2}>
          <div
            className="mt-12 p-10 md:p-14 rounded-[2rem] text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
              boxShadow: '0 40px 80px -20px rgba(30,58,138,0.4)',
            }}
          >
            <p
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-6"
              style={{
                color: '#f8fafc',
                fontFamily: designTokens.typography.fontFamily,
                letterSpacing: '-0.025em',
              }}
            >
              The small, imprisoned, dark room{' '}
              <span style={{ color: designTokens.colors.primary[400] }}>
                transformed into a colorful world
              </span>
              .
            </p>
            <p
              className="text-lg"
              style={{
                color: 'rgba(248,250,252,0.65)',
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              And experiences could go beyond mere imagination.
            </p>
          </div>
        </FadeIn>

        {/* Author signature */}
        <FadeIn delay={0.3}>
          <div className="mt-20 flex flex-col items-center gap-3">
            <div
              className="w-12 h-px"
              style={{ background: designTokens.colors.semantic.borderDefault }}
            />
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                color: designTokens.colors.semantic.textMuted,
              }}
            >
              Silviu-Alexandru Grigore
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default StoryPage;