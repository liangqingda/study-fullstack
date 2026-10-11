import type { RevealedPhase } from '../types';

import { PHASE_COLORS } from '../constants';

import styles from '../index.scss';

type JourneyBarProps = {
  /** 已揭示状态的网络阶段。 */
  phases: RevealedPhase[];
};

/**
 * 按实测耗时比例排布的横向链路条：每一段的宽度 = 该阶段耗时 / 链路总耗时。
 * 让学习者一眼看出时间花在哪个阶段（如 TLS 是否占大头）。
 */
const JourneyBar = ({ phases }: JourneyBarProps) => {
  const measured = phases.filter(
    (phase) => phase.status === 'done' && phase.durationMs !== null,
  );
  const total = measured.reduce(
    (sum, phase) => sum + (phase.durationMs ?? 0),
    0,
  );
  const base = total > 0 ? total : 1;

  if (measured.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="各网络阶段实测耗时占比"
      className={styles.journey}
      role="img"
    >
      {measured.map((phase) => {
        const share = Math.max(((phase.durationMs ?? 0) / base) * 100, 1.2);

        return (
          <span
            className={styles.journeySegment}
            key={phase.key}
            style={{ background: PHASE_COLORS[phase.key], width: `${share}%` }}
            title={`${phase.label} ${(phase.durationMs ?? 0).toFixed(2)} ms`}
          />
        );
      })}
    </div>
  );
};

export default JourneyBar;
