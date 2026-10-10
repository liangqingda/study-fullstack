import type { ReactNode } from 'react';

import styles from './index.scss';

export type DemoNavItem = {
  /** 选项唯一标识，作为选中态判断依据。 */
  key: string;
  /** 选项标题。 */
  title: string;
  /** 选项副标题。 */
  subtitle: string;
};

type DemoNavDetailProps = {
  /** 左侧导航选项。 */
  items: readonly DemoNavItem[];
  /** 左侧导航的可访问标签。 */
  navAriaLabel: string;
  /** 当前选中项的 key。 */
  selectedKey: string;
  /** 选中某项时的回调，参数为该项 key。 */
  onSelect: (key: string) => void;
  /** 右侧详情区的可访问标签。 */
  detailAriaLabel: string;
  /** 右侧详情区内容。 */
  children: ReactNode;
};

/**
 * 左侧可选中导航 + 右侧详情区的双栏框架，供需要“在多个示例间切换”的 demo 复用。
 * 窄屏下导航自动改为横向滑动，详情区置于其下方。
 */
const DemoNavDetail = ({ items, navAriaLabel, selectedKey, onSelect, detailAriaLabel, children }: DemoNavDetailProps) => (
  <div className={styles.workspace}>
    <nav aria-label={navAriaLabel} className={styles.nav}>
      {items.map((item) => (
        <button
          aria-current={selectedKey === item.key ? 'true' : undefined}
          className={`${styles.item} ${selectedKey === item.key ? styles.active : ''}`}
          key={item.key}
          onClick={() => onSelect(item.key)}
          type="button"
        >
          <strong>{item.title}</strong>
          <span>{item.subtitle}</span>
        </button>
      ))}
    </nav>
    <section aria-label={detailAriaLabel} className={styles.detail}>
      {children}
    </section>
  </div>
);

export default DemoNavDetail;
