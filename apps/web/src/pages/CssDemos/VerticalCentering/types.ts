import type { ComponentType } from 'react';

/** Tabler 图标的通用组件类型。 */
export type IconComponent = ComponentType<{ size?: number | string; stroke?: number | string }>;

/** 一种 CSS 垂直居中方案的完整教学数据。 */
export type CenteringMethod = {
  accent: string;
  code: string;
  icon: IconComponent;
  note: string;
  mechanism: string;
  observation: string;
  limitation: string;
  previewClassName: string;
  previewHint: string;
  title: string;
  usage: string;
  variant?: 'single-line' | 'table';
};

/** 顶部总结条中的一条原则。 */
export type Principle = {
  icon: IconComponent;
  text: string;
};
