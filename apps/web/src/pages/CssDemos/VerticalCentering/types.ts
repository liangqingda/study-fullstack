import type { ComponentType } from 'react';

export type IconComponent = ComponentType<{ size?: number | string; stroke?: number | string }>;

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

export type Principle = {
  icon: IconComponent;
  text: string;
};
