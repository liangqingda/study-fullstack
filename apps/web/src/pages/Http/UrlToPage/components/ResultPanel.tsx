import type { ServerResult } from '../types';

import styles from './ResultPanel.scss';

type ResultPanelProps = {
  /** 服务端返回摘要。 */
  result: ServerResult;
  /** 协议。 */
  protocol: string;
  /** 主机名。 */
  hostname: string;
  /** 端口。 */
  port: number;
  /** 链路总耗时。 */
  totalMs: number;
};

/**
 * 展示服务端返回摘要（状态码、响应头、响应体长度）与响应体片段。
 */
const ResultPanel = ({
  result,
  protocol,
  hostname,
  port,
  totalMs,
}: ResultPanelProps) => (
  <section className={styles.resultPanel}>
    <div className={styles.resultHeading}>
      <strong>服务端返回</strong>
      <span className={styles.totalMs}>链路共 {totalMs.toFixed(1)} ms</span>
    </div>
    <dl className={styles.resultGrid}>
      <dt>状态码</dt>
      <dd>
        {result.status} {result.statusText}
      </dd>
      <dt>Content-Type</dt>
      <dd>{result.contentType}</dd>
      <dt>Content-Length</dt>
      <dd>{result.contentLength ?? '无（可能为分块传输）'}</dd>
      <dt>响应体长度</dt>
      <dd>{result.bodyLength} 字节</dd>
      <dt>重定向</dt>
      <dd>{result.redirected ? '是（本次未跟随）' : '否'}</dd>
      <dt>请求地址</dt>
      <dd>{`${protocol}//${hostname}:${port}`}</dd>
    </dl>
    <h4 className={styles.bodyTitle}>响应体片段（前 2KB）</h4>
    <pre className={styles.bodyPreview}>
      {result.bodyPreview || '(空响应体)'}
    </pre>
  </section>
);

export default ResultPanel;
