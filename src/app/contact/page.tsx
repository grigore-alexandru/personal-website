import type { Metadata } from 'next';
import Image from 'next/image';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { designTokens } from '../../styles/tokens';
import { buildMetadata } from '../../lib/seo';

const DESCRIPTION = "Get in touch — email, call, or find me on social. Based in Bucharest, Romania.";

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: DESCRIPTION,
  path: '/contact',
});

// TODO placeholders — swap in the real values.
const EMAIL = 'hello@alexandrugrigore.com';
const PHONE_DISPLAY = '+40 7XX XXX XXX';
const PHONE_HREF = 'tel:+40700000000';
const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: Instagram },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: Linkedin },
  { label: 'Facebook', href: 'https://facebook.com/', icon: Facebook },
];

function ContactField({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:border-neutral-300 hover:shadow-token-sm">
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center">
        <Icon size={19} className="text-primary-600" />
      </div>
      <div className="min-w-0">
        <p
          className="text-neutral-400 mb-0.5"
          style={{
            fontSize: designTokens.typography.sizes.xxs,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.semibold,
            letterSpacing: designTokens.typography.letterSpacings.wide,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
        <p
          className="text-black truncate"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.medium,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <a href={href} className="block group">
      {content}
    </a>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-surface-base">
      <div className="max-w-screen-xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — heading + contact fields */}
          <div className="animate-fade-in-up">
            <p
              className="text-accent mb-3"
              style={{
                fontSize: designTokens.typography.sizes.xs,
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.semibold,
                letterSpacing: designTokens.typography.letterSpacings.wide,
                textTransform: 'uppercase',
              }}
            >
              Get in touch
            </p>

            <h1
              className="text-black mb-4"
              style={{
                fontSize: designTokens.typography.sizes.xl,
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.bold,
                lineHeight: designTokens.typography.lineHeights.tight,
                letterSpacing: designTokens.typography.letterSpacings.tight,
              }}
            >
              Let&apos;s work together.
            </h1>

            <p
              className="text-neutral-500 mb-10 max-w-md"
              style={{
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fontFamily,
                lineHeight: designTokens.typography.lineHeights.body,
              }}
            >
              Have a project in mind, or just want to say hello? Reach out directly — I read
              every message myself.
            </p>

            <div className="flex flex-col gap-3 max-w-md mb-10">
              <ContactField icon={Mail} label="Email" value={EMAIL} href={`mailto:${EMAIL}`} />
              <ContactField icon={Phone} label="Phone" value={PHONE_DISPLAY} href={PHONE_HREF} />
              <ContactField icon={MapPin} label="Location" value="Bucharest, Romania" />
            </div>

            <div className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 transition-all duration-200 hover:border-transparent hover:bg-black hover:text-white hover:scale-[1.06] active:scale-[0.97]"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Right — portrait, drop a transparent PNG at /public/contact-portrait.png */}
          <div className="relative hidden lg:flex items-center justify-center h-[560px] animate-fade-in-scale">
            <div
              className="absolute w-[420px] h-[420px] rounded-full blur-3xl opacity-60"
              style={{
                background: `radial-gradient(circle, ${designTokens.colors.primary[200]}, ${designTokens.colors.accent[100]} 70%, transparent 100%)`,
              }}
              aria-hidden="true"
            />
            <Image
              src="/contact-portrait.png"
              alt="Alexandru Grigore"
              fill
              sizes="(min-width: 1024px) 40vw, 0px"
              className="object-contain relative"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  );
}
