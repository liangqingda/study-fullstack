import type { ReactNode } from 'react';

import styles from './index.scss';

type DemoEmptyProps = {
  /** 占位内容，例如“等待请求”“请求中…”。 */
  children: ReactNode;
};

/**
 * 虚线框占位，用于请求尚未执行时的等待态。
 */
const DemoEmpty = ({ children }: DemoEmptyProps) => (
  <div className={styles.empty}>{children}</div>
);

export default DemoEmpty;
