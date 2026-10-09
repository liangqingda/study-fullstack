import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Group, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { TransactionError } from '@liangqingda/study-nodejs-schema';
import type { Example, Result } from './types';

import { postApiTransactionsRun } from '@/apis';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';
import { isAxiosError } from '@/utils/http';

import { examples, knowledge, structure } from './constants';

import styles from './index.scss';

const Transactions = () => {
  const [selected, setSelected] = useState<Example>(examples[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const select = (example: Example) => {
    controller.current?.abort();
    controller.current = null;
    setSelected(example);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const run = async () => {
    controller.current?.abort();
    const current = new AbortController();

    controller.current = current;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await postApiTransactionsRun({ body: { scenario: selected.key }, signal: current.signal });

      if (controller.current === current) { setResult(response.data); }
    } catch (cause) {
      if (controller.current === current && !current.signal.aborted) {
        const message = isAxiosError<TransactionError>(cause) ? cause.response?.data.error : undefined;

        setError(message ?? '请求失败；请确认后端和 study_nodejs 已启动。');
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><Title order={1}>事务实验</Title><Text c="dimmed">在真实数据库中执行，比较事务边界、快照和并发冲突。</Text></div>
          <Group gap="sm"><DemoStructureDialog structure={structure} /><DemoKnowledgeDialog content={knowledge} demoName="事务实验" /></Group>
        </header>
        <div className={styles.workspace}>
          <nav aria-label="事务场景" className={styles.navigation}>{examples.map((example) => <button aria-current={selected.key === example.key ? 'true' : undefined} className={`${styles.navItem} ${selected.key === example.key ? styles.active : ''}`} key={example.key} onClick={() => select(example)} type="button"><strong>{example.title}</strong><span>{example.subtitle}</span></button>)}</nav>
          <section aria-label="事务实验" className={styles.detail}>
            <div className={styles.heading}><div><Title order={2}>{selected.title}</Title><Text c="dimmed" size="sm">{selected.subtitle}</Text></div><Badge color="orange" variant="light">POST</Badge></div>
            <div className={styles.lesson}><div><h3>先预测</h3><Text size="sm">{selected.question}</Text></div><div><h3>关键 SQL（简化展示）</h3><pre>{selected.code}</pre></div><div><h3>运行后应看到</h3><Text size="sm">{selected.expected}</Text></div></div>
            <div className={styles.action}><code>POST /api/transactions/run</code><Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void run()}>运行实验</Button></div>
            {error && <Text c="red" role="alert">{error}</Text>}
            {!result && !error && <div className={styles.empty}>{loading ? '正在执行事务…' : '等待运行'}</div>}
            {result && <section aria-live="polite" className={styles.result}>
              <div className={styles.resultHeading}><h3>实际执行</h3><Badge color="teal" variant="light">{result.database}</Badge></div>
              <ol className={styles.timeline}>{result.steps.map((step) => <li key={`${step.session}-${step.action}`}><span className={styles.session}>{step.session}</span><div><strong>{step.action}</strong><p>{step.observation}</p></div>{step.sqlstate && <Badge color="red" variant="light">{step.sqlstate}</Badge>}</li>)}</ol>
              <div className={styles.final}><h3>最终数据</h3><div>{Object.entries(result.final).map(([name, value]) => <span key={name}><small>{name}</small><strong>{value}</strong></span>)}</div></div>
              <div className={styles.explanation}><h3>为什么得到这个结果</h3><Text size="sm">{result.outcome} {selected.explanation}</Text><Text c="dimmed" size="sm">{selected.comparison}</Text></div>
            </section>}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Transactions;
