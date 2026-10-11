import { RENDER_PHASES } from '../constants';

import styles from '../index.scss';

/**
 * 浏览器端渲染流程的静态示意。
 * 渲染发生在浏览器端，服务端请求无法实测，这里按顺序示意其子步骤。
 */
const RenderPipeline = () => (
  <section className={styles.renderSection}>
    <div className={styles.renderHeader}>
      <strong>浏览器渲染</strong>
      <span className={styles.renderHint}>
        以下步骤发生在浏览器端，服务端请求无法实测
      </span>
    </div>
    <ol className={styles.renderList}>
      {RENDER_PHASES.map((phase, index) => (
        <li className={styles.renderStep} key={phase.label}>
          <span className={styles.renderIndex}>{index + 1}</span>
          <span className={styles.renderText}>
            <strong>{phase.label}</strong>
            <span>{phase.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  </section>
);

export default RenderPipeline;
