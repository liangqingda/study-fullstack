import { Group, Text, Title } from '@mantine/core';

import type { ReactNode } from 'react';

import type { DemoStructure } from '@/components/DemoStructureDialog/types';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import styles from './index.scss';

type DemoLayoutProps = {
  /** 页面 H1 标题。 */
  title: string;
  /** 页面副标题，展示在标题下方。 */
  description: string;
  /** 传给“代码结构”弹窗的文件结构。 */
  structure: DemoStructure;
  /** 传给“知识点讲解”弹窗的 Markdown 内容。 */
  knowledge: string;
  /** 弹窗标题中展示的 Demo 名称；缺省时使用 title。 */
  demoName?: string;
  /** 页面主体内容，放在页头下方。 */
  children: ReactNode;
};

/**
 * 所有 demo 页面共用的布局：统一内容宽度与页头。
 * 页面背景由 BasicLayout 的 AppShell.Main 与全局样式提供，此处不再重复包裹。
 * 页头左侧为标题 + 副标题，右侧固定放置“代码结构”与“知识点讲解”两个弹窗入口。
 */
const DemoLayout = ({
  title,
  description,
  structure,
  knowledge,
  demoName,
  children,
}: DemoLayoutProps) => (
  <div className={styles.shell}>
    <header className={styles.header}>
      <div>
        <Title order={1}>{title}</Title>
        <Text c="dimmed">{description}</Text>
      </div>
      <Group gap="sm" justify="flex-end">
        <DemoStructureDialog structure={structure} />
        <DemoKnowledgeDialog content={knowledge} demoName={demoName ?? title} />
      </Group>
    </header>
    <div className={styles.content}>{children}</div>
  </div>
);

export default DemoLayout;
