// ============================================================
// TasGo Design Tokens
// Fresh green primary, warm white background, deep charcoal text,
// amber accent for CTAs and urgency states
// ============================================================

export const colors = {
  // Primary — fresh green
  primary: {
    50: "#F1F8E9",
    100: "#DCEDC8",
    200: "#C5E1A5",
    300: "#AED581",
    400: "#9CCC65",
    500: "#8BC34A",
    600: "#7CB342",
    700: "#558B2F",
    800: "#2E7D32",  // main brand color
    900: "#1B5E20",
  },

  // Accent — amber/orange for CTAs and urgency
  accent: {
    50: "#FFF8E1",
    100: "#FFECB3",
    200: "#FFE082",
    300: "#FFD54F",
    400: "#FFCA28",
    500: "#FFC107",  // main accent
    600: "#FFB300",
    700: "#FF8F00",
    800: "#E65100",
    900: "#BF360C",
  },

  // Surface — warm white background family
  surface: {
    bg: "#FAFAF8",        // app background
    card: "#FFFFFF",      // card background
    border: "#E8E8E4",    // dividers and borders
    hover: "#F4F4F0",     // hover/pressed states
  },

  // Text — deep charcoal family
  text: {
    primary: "#1C1C1A",   // headings, important text
    secondary: "#6B6B67", // body text, descriptions
    tertiary: "#ABABAB",  // placeholders, disabled
    inverse: "#FFFFFF",   // text on dark backgrounds
    accent: "#2E7D32",    // green text for positive states
  },

  // Status
  status: {
    success: "#2E7D32",
    successBg: "#F1F8E9",
    warning: "#F59E0B",
    warningBg: "#FFFBEB",
    error: "#DC2626",
    errorBg: "#FEF2F2",
    info: "#2563EB",
    infoBg: "#EFF6FF",
  },

  // Order status colors
  orderStatus: {
    placed: "#6B6B67",
    collector_assigned: "#2563EB",
    collecting: "#7C3AED",
    ready_for_pickup: "#F59E0B",
    carrier_assigned: "#EA580C",
    in_transit: "#2E7D32",
    delivered: "#16A34A",
    cancelled: "#DC2626",
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  "2xl": 24,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  fontSize: {
    "2xs": 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// CSS custom properties for web (Next.js / Tailwind)
export const cssTokens = `
  :root {
    --color-primary: ${colors.primary[800]};
    --color-primary-light: ${colors.primary[100]};
    --color-accent: ${colors.accent[500]};
    --color-bg: ${colors.surface.bg};
    --color-card: ${colors.surface.card};
    --color-border: ${colors.surface.border};
    --color-text-primary: ${colors.text.primary};
    --color-text-secondary: ${colors.text.secondary};
    --color-success: ${colors.status.success};
    --color-warning: ${colors.status.warning};
    --color-error: ${colors.status.error};
    --font-sans: 'Inter', system-ui, sans-serif;
  }
`;
