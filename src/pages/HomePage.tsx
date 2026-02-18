import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Camera, Film, Star, Mail, Zap, Heart } from 'lucide-react';

const FadeIn: React.FC<{ children?: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, type: 'spring', bounce: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const PlaceholderImage = ({ label = 'Image', className = '' }: { label?: string; className?: string }) => (
  <div
    className={`relative w-full h-full min-h-[400px] bg-surface-highlight rounded-4xl overflow-hidden flex items-center justify-center group ${className}`}
  >
    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-bl-[100px] transition-all duration-500 group-hover:bg-accent/10" />
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-pink/5 rounded-tr-[50px] transition-all duration-500 group-hover:bg-accent-pink/10" />
    <span className="text-display font-bold text-lg tracking-wide z-10 group-hover:scale-110 transition-transform duration-300">
      {label}
    </span>
  </div>
);

const StoryBlock = ({
  text,
  highlightColor = 'text-accent',
  imageLabel,
  reversed = false,
}: {
  text: string | React.ReactNode;
  highlightColor?: string;
  imageLabel: string;
  reversed?: boolean;
}) => (
  <div
    className={`flex flex-col lg:flex-row gap-16 lg:gap-32 items-center py-24 ${reversed ? 'lg:flex-row-reverse' : ''}`}
  >
    <FadeIn className="flex-1 space-y-8">
      <div
        className={`w-20 h-2 ${highlightColor === 'text-accent' ? 'bg-accent' : 'bg-accent-pink'} rounded-full`}
      />
      <div className="text-2xl md:text-4xl leading-snug font-medium text-body">{text}</div>
    </FadeIn>
    <FadeIn delay={0.2} className="flex-1 w-full h-[500px]">
      <PlaceholderImage label={imageLabel} className="shadow-soft bg-white border-4 border-white" />
    </FadeIn>
  </div>
);

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <section className="relative min-h-[90vh] flex items-center px-6 md:px-12 lg:px-24 pt-8 pb-20 overflow-hidden bg-surface">
      <motion.div
        style={{ y: y1 }}
        className="absolute top-20 right-[-5%] w-96 h-96 bg-accent/5 rounded-full blur-3xl"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute bottom-20 left-[-5%] w-[500px] h-[500px] bg-accent-pink/5 rounded-full blur-3xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full z-10 items-center">
        <div className="space-y-10 order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, type: 'spring' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-bold text-sm uppercase tracking-wide mb-6">
              <Zap className="w-4 h-4" fill="currentColor" />
              Visual Storyteller
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] text-display mb-8">
              I Create{' '}
              <span className="text-accent relative inline-block">
                Worlds
                <svg
                  className="absolute w-full h-3 -bottom-1 left-0 text-accent-pink"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
              ,<br />
              Not Just Videos.
            </h1>

            <p className="text-body text-xl md:text-2xl max-w-lg leading-relaxed mb-10">
              Analysis. Vision. Production. <br />
              Crafting cinematic narratives that don't just capture attention—they capture souls.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-display text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:bg-accent transition-all duration-300 flex items-center gap-3"
            >
              Start Your Story <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.2, type: 'spring' }}
          className="relative h-[600px] order-1 lg:order-2"
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-surface-highlight rounded-[3rem] transform rotate-3" />
            <div className="absolute inset-0 bg-white rounded-[3rem] shadow-soft overflow-hidden transform transition-transform hover:-rotate-1">
              <img
                src="https://placehold.co/800x1200/f1f5f9/1e293b/png?text=Portrait"
                alt="Portrait"
                className="w-full h-full object-cover"
              />
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute bottom-12 -left-6 bg-white p-6 rounded-3xl shadow-xl max-w-xs border border-surface-highlight"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-accent-pink/10 rounded-full flex items-center justify-center text-accent-pink">
                  <Heart className="w-5 h-5" fill="currentColor" />
                </div>
                <span className="font-bold text-display">Filmmaker</span>
              </div>
              <p className="text-body text-sm font-medium">Injecting soul into every frame.</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Manifesto = () => (
  <div className="py-32 bg-surface relative overflow-hidden">
    <div className="max-w-5xl mx-auto px-6 text-center space-y-16 relative z-10">
      <FadeIn>
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight text-display">
          If you want to go viral,
          <br />
          <span className="text-body opacity-40 decoration-wavy underline decoration-accent-pink">
            LEAVE THIS PAGE IMMEDIATELY.
          </span>
        </h2>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex justify-center">
          <ArrowRight className="w-12 h-12 text-accent rotate-90" />
        </div>
      </FadeIn>

      <FadeIn delay={0.4}>
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight text-display">
          If you want to be remembered,
          <br />
          <span className="text-accent cursor-pointer hover:text-accent-pink transition-colors">FOLLOW ME.</span>
        </h2>
      </FadeIn>
    </div>
  </div>
);

const Story = () => (
  <section className="px-6 md:px-12 lg:px-24 py-20 bg-surface">
    <div className="max-w-7xl mx-auto space-y-32">
      <div className="bg-surface-highlight rounded-[3rem] px-8 md:px-16">
        <StoryBlock
          text={
            <>
              I used to chase numbers. But the more I created for others, the more I realized I was just adding to the{' '}
              <span className="text-display font-bold decoration-4 decoration-accent underline underline-offset-4">
                noise
              </span>
              . Then, the shift happened.
            </>
          }
          imageLabel="The Noise"
          highlightColor="text-display"
        />
      </div>

      <div className="py-20 text-center">
        <FadeIn>
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-surface-highlight mb-10 shadow-soft">
            <ArrowRight className="w-10 h-10 text-display rotate-90" />
          </div>

          <h3 className="text-4xl md:text-6xl font-bold text-body/40 leading-tight mb-8">
            Impact isn't about <br />
            <span className="italic">"How do I get attention?"</span>
          </h3>

          <div className="flex justify-center my-8">
            <div className="w-24 h-2 rounded-full bg-accent" />
          </div>

          <h3 className="text-5xl md:text-7xl font-extrabold text-display leading-tight">
            It's about <br />
            <span className="text-accent hover:text-accent-pink transition-colors duration-500 cursor-default">
              "How do I help others evolve?"
            </span>
          </h3>
        </FadeIn>
      </div>

      <div className="bg-surface-highlight rounded-[3rem] px-8 md:px-16">
        <StoryBlock
          text={
            <>
              By creating 30 TikToks a month, I would follow trends. By{' '}
              <span className="text-accent-pink font-bold">serving a vision</span>, I would generate them.
            </>
          }
          imageLabel="Vision"
          highlightColor="text-accent-pink"
        />
      </div>

      <div className="py-20 text-center">
        <FadeIn>
          <p className="text-accent font-bold mb-6 tracking-widest uppercase">The Realization</p>
          <h3 className="text-5xl md:text-7xl font-extrabold text-display mb-12 leading-tight">
            Filmmaking became the <br />
            <span className="text-accent">ultimate means.</span>
          </h3>
          <p className="text-3xl max-w-4xl mx-auto text-body font-normal leading-relaxed">
            I stopped "making videos." And I started creating worlds.
          </p>
        </FadeIn>
      </div>

      <div className="relative w-full h-[85vh] rounded-[3rem] overflow-hidden flex items-center justify-center group">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2s]"
          src="https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_VIDEO.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9WSURFTy5tcDQiLCJpYXQiOjE3NzA5MjI2MzAsImV4cCI6MTgwMjQ1ODYzMH0.Z2kP5B44DyVjS23XQO5TJfijAQyAFBYNGglbpN3jZAc"
        />
        <div className="absolute inset-0 bg-display/30 backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-6xl mx-auto text-center px-8">
          <FadeIn>
            <h2 className="text-5xl md:text-8xl font-extrabold text-white leading-tight drop-shadow-lg">
              "Content is light on a screen.
            </h2>
            <div className="h-12" />
            <h2 className="text-5xl md:text-8xl font-extrabold text-white leading-tight drop-shadow-lg">
              <span className="text-accent-pink">A story</span> is something you step into."
            </h2>
          </FadeIn>
        </div>
      </div>
    </div>
  </section>
);

const Services = () => {
  const steps = [
    { text: 'I analyze every angle of your vision', icon: <Star className="w-8 h-8" /> },
    { text: 'I generate YOUR UNIQUE STORY', icon: <Film className="w-8 h-8" />, highlight: true },
    { text: 'I make a PRODUCTION out of it', icon: <Camera className="w-8 h-8" /> },
  ];

  return (
    <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24 py-24 relative overflow-hidden bg-surface">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center max-w-7xl mx-auto w-full">
        <div className="space-y-16">
          <FadeIn>
            <h3 className="text-sm font-bold text-accent tracking-widest uppercase mb-6 bg-accent/10 inline-block px-4 py-2 rounded-full">
              The Process
            </h3>
            <h2 className="text-5xl md:text-6xl font-extrabold text-display leading-tight">
              Whether it's a feature film or a thirty-second advert
            </h2>
          </FadeIn>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  className={`flex items-center gap-8 p-8 rounded-3xl transition-all ${
                    step.highlight
                      ? 'bg-display text-white shadow-xl scale-105'
                      : 'bg-surface-highlight text-display hover:bg-white hover:shadow-lg'
                  }`}
                >
                  <div className={step.highlight ? 'text-accent' : 'text-body'}>{step.icon}</div>
                  <p className={`text-xl md:text-2xl font-bold ${step.highlight ? 'text-white' : 'text-display'}`}>
                    {step.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <p className="text-3xl font-extrabold text-accent-pink">Don't expect a camera; expect a set.</p>
          </FadeIn>
        </div>

        <FadeIn delay={0.3} className="h-[700px]">
          <PlaceholderImage label="The Set" className="bg-surface-highlight rounded-[4rem]" />
        </FadeIn>
      </div>
    </section>
  );
};

const Testimonials = () => (
  <section className="py-32 px-6 md:px-12 bg-white">
    <div className="max-w-6xl mx-auto text-center mb-24">
      <FadeIn>
        <h2 className="text-3xl md:text-5xl font-bold mb-8 text-body/40">"Just fluff. I don't believe you."</h2>
        <h2 className="text-4xl md:text-6xl font-extrabold text-display">
          You don't have to. <br />
          <span className="text-accent bg-accent/10 px-4 rounded-lg">Believe them instead.</span>
        </h2>
      </FadeIn>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {[1, 2, 3].map((i) => (
        <FadeIn key={i} delay={i * 0.1}>
          <div className="bg-surface-highlight p-10 rounded-[2.5rem] hover:shadow-soft transition-all duration-300 group min-h-[350px] flex flex-col border border-transparent hover:border-accent/20">
            <div className="mb-8 flex text-accent gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <p className="text-display text-xl font-medium leading-relaxed flex-grow">
              "An absolute visionary. The way the story unfolded was unlike anything we've seen in our industry."
            </p>
            <div className="mt-10 flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden">
                <img src={`https://placehold.co/100x100/e2e8f0/1e293b/png?text=${i}`} alt="Client" />
              </div>
              <div>
                <p className="text-display font-bold text-lg">Client Name</p>
                <p className="text-body text-sm font-medium">CEO, Tech Company</p>
              </div>
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  </section>
);

const Contact = () => (
  <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24 py-24 relative overflow-hidden bg-surface-highlight rounded-t-[5rem] mt-20">
    <div className="max-w-3xl mx-auto w-full text-center">
      <FadeIn>
        <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-10 text-accent-pink shadow-soft">
          <Mail className="w-10 h-10" />
        </div>
        <h2 className="text-5xl md:text-7xl font-extrabold text-display mb-10">
          So If you have a vision that deserves a <span className="text-accent-pink">soul</span>, let's talk.
        </h2>
      </FadeIn>

      <FadeIn delay={0.2} className="mt-20 bg-white p-12 rounded-[3rem] shadow-soft">
        <form className="space-y-8 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wider text-body">Name</label>
              <input
                type="text"
                className="w-full bg-surface-highlight rounded-xl border-none p-5 text-display font-medium focus:ring-2 focus:ring-accent transition-all"
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wider text-body">Email</label>
              <input
                type="email"
                className="w-full bg-surface-highlight rounded-xl border-none p-5 text-display font-medium focus:ring-2 focus:ring-accent transition-all"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-body">The Vision</label>
            <textarea
              rows={4}
              className="w-full bg-surface-highlight rounded-xl border-none p-5 text-display font-medium focus:ring-2 focus:ring-accent transition-all"
              placeholder="Tell me about your world..."
            />
          </div>
          <button className="w-full py-6 mt-8 bg-display text-white rounded-2xl font-bold text-xl hover:bg-accent hover:scale-[1.02] transition-all duration-300 shadow-lg">
            Initiate Collaboration
          </button>
        </form>
      </FadeIn>
    </div>
  </section>
);

export default function HomePage() {
  return (
    <div className="bg-surface text-display overflow-hidden selection:bg-accent selection:text-white">
      <Hero />
      <Manifesto />
      <Story />
      <Services />
      <Testimonials />
      <Contact />

      <footer className="py-12 text-center text-body text-sm font-medium bg-surface-highlight">
        © {new Date().getFullYear()} Visionary Production. All Rights Reserved.
      </footer>
    </div>
  );
}
