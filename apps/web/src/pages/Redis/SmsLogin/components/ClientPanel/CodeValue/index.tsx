import type { ReactNode } from 'react';

import styles from './index.scss';

/** 内联等宽小号 code，用于展示验证码、token 片段等短值。 */
const CodeValue = ({ children }: { children: ReactNode }) => (
  <code className={styles.codeValue}>{children}</code>
);

export default CodeValue;
