export const designTokens = {
  colors: {
    background: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: 'rgba(0,0,0,0.4)',
    shadow: 'rgba(0,0,0,0.05)',

    primary: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    accent: {
      50:  '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
    },

    neutral: {
      0:   '#ffffff',
      50:  '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },

    success: {
      100: '#dcfce7',
      500: '#22c55e',
      700: '#15803d',
    },
    warning: {
      100: '#fef9c3',
      500: '#eab308',
      700: '#a16207',
    },
    error: {
      100: '#fee2e2',
      500: '#ef4444',
      700: '#b91c1c',
    },

    semantic: {
      surfaceBase:    '#ffffff',
      surfaceRaised:  '#ffffff',
      surfaceSunken:  '#fafafa',
      surfaceOverlay: 'rgba(0,0,0,0.4)',
      borderDefault:  '#e5e5e5',
      borderStrong:   '#d4d4d4',
      borderFocus:    '#3b82f6',
      textPrimary:    '#171717',
      textSecondary:  '#525252',
      textMuted:      '#a3a3a3',
      textDisabled:   '#d4d4d4',
      textOnDark:     '#ffffff',
      textAccent:     '#ec4899',
      textLink:       '#2563eb',
      textLinkHover:  '#1d4ed8',
    },
  },

  shadows: {
    none:    'none',
    xs:      '0 1px 2px 0 rgba(0,0,0,0.05)',
    sm:      '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    md:      '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    raised:  '0 4px 12px -2px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
    lifted:  '0 12px 28px -4px rgba(0,0,0,0.18), 0 6px 12px -4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95)',
    lg:      '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl:      '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    focus:   '0 0 0 3px rgba(59,130,246,0.4)',
    focusAccent: '0 0 0 3px rgba(236,72,153,0.4)',
  },

  radius: {
    none: '0',
    sm:   '4px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    '2xl':'20px',
    full: '9999px',
  },

  transitions: {
    fast:   '150ms ease',
    base:   '250ms ease',
    slow:   '400ms ease',
    smooth: '300ms cubic-bezier(0.4,0,0.2,1)',
    spring: '350ms cubic-bezier(0.34,1.56,0.64,1)',
    lift:   'transform 250ms cubic-bezier(0.4,0,0.2,1), box-shadow 250ms cubic-bezier(0.4,0,0.2,1)',
  },

  typography: {
    fontFamily: "'Poppins', sans-serif",
    weights: {
      light:   300,
      regular: 400,
      medium:  500,
      semibold: 600,
      bold:    700,
    },
    sizes: {
      xxl: '64px',
      xl:  '48px',
      lg:  '32px',
      md:  '24px',
      sm:  '18px',
      xs:  '14px',
      xxs: '12px',
    },
    lineHeights: {
      heading: 1.2,
      body:    1.5,
      tight:   1.1,
    },
    letterSpacings: {
      normal: '0',
      wide:   '0.1em',
      tight:  '-0.02em',
    },
  },

  spacing: {
    scale: {
      xxl: '64px',
      xl:  '48px',
      lg:  '32px',
      md:  '24px',
      sm:  '16px',
      xs:  '8px',
      xxs: '4px',
    },
    layout: {
      maxWidth:  '1280px',
      gutter:    '24px',
      columns:   12,
      columnGap: '24px',
      rowGap:    '24px',
    },
    breakpoints: {
      mobile:  '0px',
      tablet:  '768px',
      desktop: '1024px',
    },
  },

  motion: {
    duration: '0.3s',
    easing:   'ease',
  },
};
