import colors from './colors.js';

// Ant Design theme configuration for BikeRide
// This customizes Ant Design to match the modern BikeRide visual identity

export const antDesignTheme = {
  token: {
    // Colors
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,

    // Backgrounds
    colorBgBase: colors.bgPrimary,
    colorBgContainer: colors.bgSecondary,
    colorBgElevated: colors.bgPrimary,
    colorBgLayout: colors.bgSecondary,

    // Text
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textTertiary,

    // Borders
    colorBorder: colors.border,
    colorBorderBg: colors.borderLight,

    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontSizeHeading6: 14,
    fontWeightStrong: 600,
    lineHeight: 1.5715,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.35,

    // Spacing
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginMD: 16,
    marginLG: 24,
    marginXL: 32,
    padding: 16,
    paddingXS: 8,
    paddingSM: 12,
    paddingMD: 16,
    paddingLG: 24,
    paddingXL: 32,

    // Border radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    // Sizing
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,

    // Shadows
    boxShadow: colors.shadowMd,
    boxShadowSecondary: colors.shadowSm,

    // Transitions
    motionUnit: 0.1,
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
    motionEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
    motionEaseInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
    motionEaseOutCirc: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    motionEaseInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
    motionEaseOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',

    // Other
    screenXS: 480,
    screenSM: 576,
    screenMD: 768,
    screenLG: 992,
    screenXL: 1200,
    screenXXL: 1600,
  },

  components: {
    // Button customization
    Button: {
      primaryColor: colors.primary,
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      boxShadow: 'none',
      boxShadowSecondary: 'none',
    },

    // Input customization
    Input: {
      borderRadius: 8,
      controlHeight: 40,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      boxShadow: 'none',
      paddingBlock: 8,
      paddingInline: 12,
    },

    // Card customization
    Card: {
      borderRadius: 12,
      boxShadow: colors.shadowMd,
      boxShadowSecondary: colors.shadowSm,
      paddingLG: 24,
      paddingMD: 16,
      paddingSM: 12,
    },

    // Modal customization
    Modal: {
      borderRadius: 12,
      boxShadow: colors.shadowLg,
      contentBg: colors.bgPrimary,
    },

    // Select customization
    Select: {
      borderRadius: 8,
      controlHeight: 40,
      boxShadow: 'none',
    },

    // DatePicker customization
    DatePicker: {
      borderRadius: 8,
      controlHeight: 40,
      boxShadow: 'none',
    },

    // Table customization
    Table: {
      borderRadius: 8,
      headerBg: colors.bgSecondary,
      rowHoverBg: colors.bgTertiary,
    },

    // Tag customization
    Tag: {
      borderRadius: 6,
      fontWeight: 600,
    },

    // Badge customization
    Badge: {
      colorSuccess: colors.success,
    },

    // Notification/Message customization
    Notification: {
      boxShadow: colors.shadowLg,
      borderRadius: 8,
    },

    // Layout customization
    Layout: {
      headerBg: colors.bgPrimary,
      headerHeight: 64,
      headerPadding: '0 24px',
      headerColor: colors.textPrimary,
      footerBg: colors.bgSecondary,
      footerPadding: '24px',
      siderBg: colors.bgPrimary,
    },
  },
};

export default antDesignTheme;
