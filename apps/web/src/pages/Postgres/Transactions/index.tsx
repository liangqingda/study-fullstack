import { useState } from 'react';
import { Badge, Button, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { TransactionError } from '@liangqingda/study-nodejs-schema';
import type { Example, Result } from './types';

import { postApiTransactionsRun } from '@/apis';
import CodeBlock from '@/components/CodeBlock';
import DemoEmpty from '@/components/DemoEmpty';
import DemoNavDetail from '@/components/DemoNavDetail';
import { useDemoRequest } from '@/hooks/useDemoRequest';
import DemoLayout from '@/layouts/DemoLayout';
import { isAxiosError } from '@/utils/http';

import { EXAMPLES, KNOWLEDGE, STRUCTURE } from './constants';

import styles from './index.scss';

const Transactions = () => {
  const [selected, setSelected] = useState<Example>(EXAMPLES[0]);
  const { result, error, loading, reset, run } = useDemoRequest<Result>();

  const select = (example: Example) => {
    setSelected(example);
    reset();
  };

  const runExperiment = () => {
    void run(async (signal) => {
      try {
        const response = await postApiTransactionsRun({ body: { scenario: selected.key }, signal });

        return response.data;
      } catch (cause) {
        const message = isAxiosError<TransactionError>(cause) ? cause.response?.data.error : undefined;

        throw new Error(message ?? '请求失败；请确认后端和 study_nodejs 已启动。');
      }
    });
  };

  return (
    <DemoLayout
      description="在真实数据库中执行，比较事务边界、快照和并发冲突。"
      knowledge={KNOWLEDGE}
      structure={STRUCTURE}
      title="事务实验"
    >
      <DemoNavDetail
        detailAriaLabel="事务实验"
        items={EXAMPLES.map((example) => ({ key: example.key, title: example.title, subtitle: example.subtitle }))}
        navAriaLabel="事务场景"
        onSelect={(key) => {
          const example = EXAMPLES.find((item) => item.key === key);

          if (example) { select(example); }
        }}
        selectedKey={selected.key}
      >
            <div className={styles.heading}><div><Title order={2}>{selected.title}</Title><Text c="dimmed" size="sm">{selected.subtitle}</Text></div><Badge color="orange" variant="light">POST</Badge></div>
            <div className={styles.lesson}><div><h3>先预测</h3><Text size="sm">{selected.question}</Text></div><div><h3>关键 SQL（简化展示）</h3><CodeBlock code={selected.code} language="sql" /></div><div><h3>运行后应看到</h3><Text size="sm">{selected.expected}</Text></div></div>
            <div className={styles.action}><code>POST /api/transactions/run</code><Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void runExperiment()}>运行实验</Button></div>
            {error && <Text c="red" role="alert">{error}</Text>}
            {!result && !error && <DemoEmpty>{loading ? '正在执行事务…' : '等待运行'}</DemoEmpty>}
            {result && <section aria-live="polite" className={styles.result}>
              <div className={styles.resultHeading}><h3>实际执行</h3><Badge color="teal" variant="light">{result.database}</Badge></div>
              <ol className={styles.timeline}>{result.steps.map((step) => <li key={`${step.session}-${step.action}`}><span className={styles.session}>{step.session}</span><div><strong>{step.action}</strong><p>{step.observation}</p></div>{step.sqlstate && <Badge color="red" variant="light">{step.sqlstate}</Badge>}</li>)}</ol>
              <div className={styles.final}><h3>最终数据</h3><div>{Object.entries(result.final).map(([name, value]) => <span key={name}><small>{name}</small><strong>{value}</strong></span>)}</div></div>
              <div className={styles.explanation}><h3>为什么得到这个结果</h3><Text size="sm">{result.outcome} {selected.explanation}</Text><Text c="dimmed" size="sm">{selected.comparison}</Text></div>
            </section>}
          </DemoNavDetail>
    </DemoLayout>
  );
};

export default Transactions;
