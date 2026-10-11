import type { RevealedPhase } from '../types';

import { PHASE_COLORS } from '../constants';

import styles from './PhaseList.scss';

type PhaseListProps = {
  /** 已揭示状态的网络阶段（按链路顺序）。 */
  phases: RevealedPhase[];
};

const statusClass = {
  idle: styles.statusIdle,
  done: styles.statusDone,
  error: styles.statusError,
} as const;

/**
 * 逐阶段揭示的纵向链路列表：状态点、阶段名、机制说明与实测耗时。
 * 状态通过点颜色与文字两者共同表达（不只靠颜色）。
 */
const PhaseList = ({ phases }: PhaseListProps) => (
  <ol className={styles.phaseList}>
    {phases.map((phase) => {
      let meta = '等待';

      if (phase.status === 'done') {
        meta = `${(phase.durationMs ?? 0).toFixed(1)} ms`;
      } else if (phase.status === 'error') {
        meta = '失败';
      }

      return (
        <li
          className={`${styles.phaseRow} ${statusClass[phase.status]}`}
          key={phase.key}
        >
          <span
            aria-hidden="true"
            className={styles.phaseDot}
            style={{ background: PHASE_COLORS[phase.key] }}
          />
          <span className={styles.phaseText}>
            <span className={styles.phaseLabel}>{phase.label}</span>
            <span className={styles.phaseNote}>{phase.note}</span>
          </span>
          <span className={styles.phaseMeta}>{meta}</span>
        </li>
      );
    })}
  </ol>
);

export default PhaseList;
