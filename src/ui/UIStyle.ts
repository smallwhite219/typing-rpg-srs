/**
 * UIStyle - 賽博戰場設計規範
 */

export const UI_STYLE = {
  // 色彩系統
  COLORS: {
    PRIMARY: 0xef4444,   // 戰鬥紅 (Red 500)
    SECONDARY: 0x8b5cf6, // 能量紫 (Violet 500)
    ACCENT: 0xfacc15,    // 警告黃 (Yellow 400)
    SUCCESS: 0x22c55e,   // 達成綠 (Green 500)
    BG_DARK: 0x09090b,   // 極黑背景 (Zinc 950)
    GLASS_BG: 0x18181b,  // 玻璃背景 (Zinc 900)
    TEXT_MAIN: 0xffffff, // 主文字
    TEXT_DIM: 0x71717a,  // 次要文字 (Zinc 400)
  },

  // 字體配置
  FONTS: {
    MONO: 'Consolas, monospace',
    SANS: 'Microsoft JhengHei, sans-serif',
  },

  // 玻璃擬態透明度
  GLASS_ALPHA: 0.7,
  
  // 震動震幅
  SHAKE_INTENSITY: 5,
};

/**
 * 取得玻璃背景樣式 (用於 Graphics)
 */
export const getGlassStyle = (color: number = UI_STYLE.COLORS.GLASS_BG) => ({
  color,
  alpha: UI_STYLE.GLASS_ALPHA,
  blur: 10,
});
