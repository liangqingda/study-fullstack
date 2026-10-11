import { useEffect, useMemo, useState } from 'react';
import { Button, Loader, Text, TextInput } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { PhaseKey, PhaseStatus, RevealedPhase } from './types';

import DemoEmpty from '@/components/DemoEmpty';
import DemoLayout from '@/layouts/DemoLayout';

import JourneyBar from './components/JourneyBar';
import PhaseList from './components/PhaseList';
import RenderPipeline from './components/RenderPipeline';
import ResultPanel from './components/ResultPanel';
import {
  INITIAL_URL,
  KNOWLEDGE,
  NETWORK_PHASES,
  PRESET_URLS,
  STRUCTURE,
} from './constants';
import { useUrlToPage } from './hooks/useUrlToPage';

import styles from './index.scss';

/**
 * "从 URL 输入到页面展示"演示页。
 *
 * 用户输入目标 URL 并点击"开始加载"，后端用 Node 原生 http/https 发起真实
 * 请求并实测各阶段耗时；页面按顺序逐步揭示每个阶段（显示真实毫秒），用
 * journey bar 呈现耗时占比，并示意浏览器端渲染流程。
 */
const UrlToPage = () => {
  const { result, loading, reset, run, failure } = useUrlToPage();
  const [url, setUrl] = useState(INITIAL_URL);
  const [revealStep, setRevealStep] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  // 成功响应的阶段实测耗时（key -> ms）。
  const measured = useMemo(() => {
    if (!result) {
      return {};
    }

    return Object.fromEntries(result.phases.map((phase) => [phase.key, phase.durationMs]));
  }, [result]);

  // 失败时，定位首个未完成的阶段（即链路卡住的位置）。
  const failedKey = useMemo<PhaseKey | null>(() => {
    if (!failure) {
      return null;
    }

    const reached = new Set(failure.reached.map((entry) => entry.key));

    return NETWORK_PHASES.find((phase) => !reached.has(phase.key))?.key ?? null;
  }, [failure]);

  // 成功响应到达后，按链路顺序逐步揭示每个阶段（仅在定时器回调里更新状态）。
  useEffect(() => {
    if (!result) {
      return;
    }

    const total = result.phases.length;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setRevealStep(step);

      if (step >= total) {
        window.clearInterval(timer);
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [result]);

  const handleRun = () => {
    setHasRun(true);
    setRevealStep(0);
    reset();
    run(url.trim());
  };

  // 失败时所有已完成阶段直接标为 done；成功时按 revealStep 逐步揭示。
  const doneCount = failure ? failure.reached.length : revealStep;
  const phases: RevealedPhase[] = NETWORK_PHASES.map((phase, index) => {
    const reachedDuration = failure?.reached.find(
      (entry) => entry.key === phase.key,
    )?.durationMs;
    const durationMs = result
      ? (measured[phase.key] ?? null)
      : (reachedDuration ?? null);
    let status: PhaseStatus = 'idle';

    if (failedKey === phase.key) {
      status = 'error';
    } else if (index < doneCount) {
      status = 'done';
    }

    return { ...phase, status, durationMs };
  });

  return (
    <DemoLayout
      description="输入目标 URL，用真实请求实测 DNS、TCP、TLS、HTTP 各阶段耗时，再看浏览器如何渲染。"
      knowledge={KNOWLEDGE}
      structure={STRUCTURE}
      title="URL 到页面"
    >
      <section className={styles.control}>
        <div className={styles.urlRow}>
          <TextInput
            aria-label="目标 URL"
            className={styles.urlInput}
            onChange={(event) => setUrl(event.currentTarget.value)}
            placeholder="https://example.com"
            value={url}
          />
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={loading}
            onClick={handleRun}
          >
            开始加载
          </Button>
        </div>
        <div aria-label="示例 URL" className={styles.presets} role="list">
          {PRESET_URLS.map((preset) => (
            <button
              className={styles.preset}
              key={preset.url}
              onClick={() => setUrl(preset.url)}
              role="listitem"
              title={preset.hint}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <Text c="dimmed" className={styles.loadingHint} size="sm">
          <Loader size="xs" />
          正在发起真实请求并实测各阶段…
        </Text>
      )}
      {failure && (
        <Text c="red" className={styles.errorBanner} role="alert">
          {failure.message}
        </Text>
      )}

      {!hasRun && (
        <DemoEmpty>
          输入目标 URL 或选择一个示例，点击“开始加载”，观察真实的网络链路与各阶段耗时。
        </DemoEmpty>
      )}
      {hasRun && (
        <>
          <JourneyBar phases={phases} />
          <PhaseList phases={phases} />
          {result && (
            <ResultPanel
              hostname={result.hostname}
              port={result.port}
              protocol={result.protocol}
              result={result.result}
              totalMs={result.totalMs}
            />
          )}
        </>
      )}

      <RenderPipeline />
    </DemoLayout>
  );
};

export default UrlToPage;
