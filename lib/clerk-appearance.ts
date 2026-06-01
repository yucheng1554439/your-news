const sharedVariables = {
  colorBackground: "#27272a",
  colorInputBackground: "#18181b",
  colorInputText: "#fafafa",
  colorText: "#fafafa",
  colorTextSecondary: "#e4e4e7",
  colorTextOnPrimaryBackground: "#09090b",
  colorPrimary: "#fafafa",
  colorDanger: "#f87171",
  colorSuccess: "#86efac",
  colorNeutral: "#d4d4d8",
  borderRadius: "0.75rem",
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  fontFamilyButtons: "var(--font-geist-sans), system-ui, sans-serif",
};

const sharedInputStyles =
  "border-white/10 bg-zinc-950 text-white placeholder:text-zinc-500 focus:border-white/25";

const sharedPrimaryButton =
  "rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-none font-medium";

const sharedSocialButton =
  "border border-white/10 bg-zinc-950 text-white hover:bg-zinc-800";

/** Navbar account menu, popovers — shared app chrome. */
export const clerkAppearance = {
  variables: sharedVariables,
  elements: {
    rootBox: "w-full mx-auto",
    cardBox: "w-full shadow-none mx-auto",
    card: "w-full bg-zinc-900 border border-white/10 shadow-xl shadow-black/20 rounded-2xl p-2 sm:p-4",
    headerTitle: "font-serif text-white tracking-tight",
    headerSubtitle: "text-zinc-300",
    socialButtonsBlockButton: sharedSocialButton,
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/10",
    dividerText: "text-zinc-400",
    formFieldLabel: "text-zinc-200",
    formFieldInput: sharedInputStyles,
    formButtonPrimary: sharedPrimaryButton,
    footerActionLink: "text-zinc-200 hover:text-white font-medium",
    footerActionText: "text-zinc-300",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-zinc-300 hover:text-white",
    formFieldInputShowPasswordButton: "text-zinc-300 hover:text-white",
    alertText: "text-zinc-200",
    otpCodeFieldInput: "border-white/10 bg-zinc-950 text-white",
    navbarButton: "text-zinc-300",
    profileSectionTitle: "text-white",
    profileSectionContent: "text-zinc-200",
    accordionTriggerButton: "text-zinc-200",
    badge: "border-white/10 bg-zinc-800 text-zinc-100",
    userButtonPopoverCard:
      "!bg-zinc-800 border border-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] rounded-xl",
    userButtonPopoverMain: "text-zinc-100",
    userButtonPopoverActionButton:
      "text-zinc-100 hover:bg-zinc-700/80 rounded-lg transition-colors",
    userButtonPopoverActionButtonText: "text-zinc-100",
    userButtonPopoverActionButtonIcon: "text-zinc-400",
    userButtonPopoverFooter: "border-t border-white/10 bg-zinc-800/90",
    userPreviewMainIdentifier: "text-white font-medium",
    userPreviewSecondaryIdentifier: "text-zinc-400",
    menuList:
      "bg-zinc-800 border border-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)]",
    menuItem: "text-zinc-100 hover:bg-zinc-700/80",
    menuButton: "text-zinc-100",
  },
  layout: {
    socialButtonsPlacement: "top",
    showOptionalFields: true,
  },
};

/** Sign-in / sign-up — solid card, high contrast, no glass overlay. */
export const clerkAuthAppearance = {
  variables: {
    ...sharedVariables,
    colorBackground: "#18181b",
    colorText: "#fafafa",
    colorTextSecondary: "#e4e4e7",
    colorNeutral: "#d4d4d8",
  },
  elements: {
    ...clerkAppearance.elements,
    rootBox: "w-full mx-auto relative z-10",
    cardBox: "w-full mx-auto bg-transparent shadow-none",
    card: "w-full bg-zinc-900 border border-white/12 rounded-2xl shadow-none p-3 sm:p-5",
    main: "gap-6",
    header: "gap-2",
    headerTitle:
      "font-serif text-2xl text-white font-semibold tracking-tight !opacity-100",
    headerSubtitle: "text-zinc-300 text-sm leading-relaxed !opacity-100",
    socialButtonsBlockButton: sharedSocialButton,
    socialButtonsBlockButtonText: "text-white font-medium !opacity-100",
    dividerLine: "bg-white/12",
    dividerText: "text-zinc-400 text-sm !opacity-100",
    formFieldLabel: "text-zinc-100 text-sm font-medium !opacity-100",
    formFieldHintText: "text-zinc-400 text-xs !opacity-100",
    formFieldErrorText: "text-red-400 text-sm !opacity-100",
    formFieldInput: sharedInputStyles,
    formFieldInputShowPasswordButton:
      "text-zinc-300 hover:text-white !opacity-100",
    formButtonPrimary: sharedPrimaryButton,
    formButtonReset: "text-zinc-300 hover:text-white !opacity-100",
    footer: "bg-transparent !opacity-100",
    footerActionText: "text-zinc-300 text-sm !opacity-100",
    footerActionLink: "text-white font-medium hover:text-zinc-200 !opacity-100",
    formHeaderTitle:
      "font-serif text-xl text-white font-semibold !opacity-100",
    formHeaderSubtitle: "text-zinc-300 text-sm !opacity-100",
    backLink: "text-zinc-300 hover:text-white !opacity-100",
    identityPreviewText: "text-white !opacity-100",
    identityPreviewEditButton: "text-zinc-300 hover:text-white !opacity-100",
    alertText: "text-zinc-200 !opacity-100",
    formResendCodeLink: "text-zinc-200 hover:text-white !opacity-100",
    alternativeMethodsBlockButton: sharedSocialButton,
    alternativeMethodsBlockButtonText: "text-white !opacity-100",
    otpCodeFieldInput: "border-white/10 bg-zinc-950 text-white",
    modalBackdrop: "hidden",
    modalContent: "bg-zinc-900",
    internal: "!opacity-100",
  },
  layout: {
    socialButtonsPlacement: "top",
    showOptionalFields: true,
  },
};
