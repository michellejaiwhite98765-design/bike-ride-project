import { theme as antdThemeApi } from 'antd';

// Ant Design theme configuration for BikeRide.
// antd's algorithm derives many un-overridden tokens from these seed colors
// using real color math, so - unlike theme/colors.js - these need actual
// literal hex/rgba values per mode rather than CSS variable strings.

const shared = {
  colorPrimary: '#2DD4BF',
  colorSuccess: '#22C55E',
  colorWarning: '#FBBF24',
  colorError: '#F87171',
  colorInfo: '#60A5FA',

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

  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  borderRadiusXS: 2,

  controlHeight: 40,
  controlHeightLG: 48,
  controlHeightSM: 32,
  controlHeightXS: 24,

  motionUnit: 0.1,
  motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  motionEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
  motionEaseInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  motionEaseOutCirc: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  motionEaseInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  motionEaseOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',

  screenXS: 480,
  screenSM: 576,
  screenMD: 768,
  screenLG: 992,
  screenXL: 1200,
  screenXXL: 1600,
};

const palettes = {
  dark: {
    bgBase: '#0B0F17',
    bgContainer: '#05070D',
    bgElevated: '#0B0F17',
    bgLayout: '#05070D',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: 'rgba(255, 255, 255, 0.1)',
    borderBg: 'rgba(255, 255, 255, 0.06)',
    shadowMd: '0 8px 20px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.4)',
    shadowSm: '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
    shadowLg: '0 16px 36px -6px rgba(0, 0, 0, 0.55), 0 6px 14px -4px rgba(0, 0, 0, 0.4)',
  },
  light: {
    bgBase: '#FFFFFF',
    bgContainer: '#F5F7FA',
    bgElevated: '#FFFFFF',
    bgLayout: '#F5F7FA',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: 'rgba(15, 23, 42, 0.12)',
    borderBg: 'rgba(15, 23, 42, 0.08)',
    shadowMd: '0 8px 20px -4px rgba(15, 23, 42, 0.14), 0 2px 6px -2px rgba(15, 23, 42, 0.1)',
    shadowSm: '0 1px 3px 0 rgba(15, 23, 42, 0.08)',
    shadowLg: '0 16px 36px -6px rgba(15, 23, 42, 0.16), 0 6px 14px -4px rgba(15, 23, 42, 0.1)',
  },
};

export function getAntdTheme(mode = 'dark') {
  const p = palettes[mode] ?? palettes.dark;

  return {
    algorithm: mode === 'light' ? antdThemeApi.defaultAlgorithm : antdThemeApi.darkAlgorithm,
    token: {
      ...shared,
      colorBgBase: p.bgBase,
      colorBgContainer: p.bgContainer,
      colorBgElevated: p.bgElevated,
      colorBgLayout: p.bgLayout,
      colorText: p.text,
      colorTextSecondary: p.textSecondary,
      colorTextTertiary: p.textTertiary,
      colorBorder: p.border,
      colorBorderBg: p.borderBg,
      boxShadow: p.shadowMd,
      boxShadowSecondary: p.shadowSm,
    },
    components: {
      Button: {
        borderRadius: 8,
        controlHeight: 40,
        fontWeight: 600,
        boxShadow: 'none',
        boxShadowSecondary: 'none',
      },
      Input: {
        borderRadius: 8,
        controlHeight: 40,
        fontFamily: shared.fontFamily,
        boxShadow: 'none',
        paddingBlock: 8,
        paddingInline: 12,
      },
      Card: {
        borderRadius: 12,
        boxShadow: p.shadowMd,
        boxShadowSecondary: p.shadowSm,
        paddingLG: 24,
        paddingMD: 16,
        paddingSM: 12,
      },
      Modal: {
        borderRadius: 12,
        boxShadow: p.shadowLg,
        contentBg: p.bgBase,
      },
      Select: {
        borderRadius: 8,
        controlHeight: 40,
        boxShadow: 'none',
      },
      DatePicker: {
        borderRadius: 8,
        controlHeight: 40,
        boxShadow: 'none',
      },
      Table: {
        borderRadius: 8,
        headerBg: p.bgContainer,
        rowHoverBg: mode === 'light' ? '#EEF1F4' : '#141A24',
      },
      Tag: {
        borderRadius: 6,
        fontWeight: 600,
      },
      Badge: {
        colorSuccess: shared.colorSuccess,
      },
      Notification: {
        boxShadow: p.shadowLg,
        borderRadius: 8,
      },
      Layout: {
        headerBg: p.bgBase,
        headerHeight: 64,
        headerPadding: '0 24px',
        headerColor: p.text,
        footerBg: p.bgContainer,
        footerPadding: '24px',
        siderBg: p.bgBase,
      },
    },
  };
}

// Backward-compatible default (dark) for any straggler import.
export const antDesignTheme = getAntdTheme('dark');

export default antDesignTheme;
