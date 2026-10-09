import type { ComponentType } from 'react';

/**
 * Tabler 图标的通用组件类型。
 */
export type IconComponent = ComponentType<{ size?: number | string; stroke?: number | string }>;

/**
 * 一种 CSS 垂直居中方案的完整教学数据。
 */
export type CenteringMethod = {
  /** 主题色。 */
  accent: string;
  /** 示例 CSS 代码。 */
  code: string;
  /** 卡片图标。 */
  icon: IconComponent;
  /** 使用建议。 */
  note: string;
  /** 居中机制讲解。 */
  mechanism: string;
  /** 切换尺寸后应观察的现象。 */
  observation: string;
  /** 局限性和不适用场景。 */
  limitation: string;
  /** 预览区域的样式类名。 */
  previewClassName: string;
  /** 预览区域中的提示文字。 */
  previewHint: string;
  /** 方案名称。 */
  title: string;
  /** 适用场景标签。 */
  usage: string;
  /** 特殊渲染变体。 */
  variant?: 'single-line' | 'table';
};

/**
 * 顶部总结条中的一条原则。
 */
export type Principle = {
  /** 原则图标。 */
  icon: IconComponent;
  /** 原则文字。 */
  text: string;
};
