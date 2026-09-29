import { Badge } from '@mantine/core';

import type { Result } from '../hooks/useResponseRequest';

import styles from '../index.scss';

const statusColor = (status: number) => {
  if (status >= 400) {
    return 'red';
  }

  if (status >= 300) {
    return 'yellow';
  }

  return 'teal';
};

const ResponseResult = ({ interpretation, result, showPreview }: { interpretation: string; result: Result; showPreview: boolean }) => (
  <div className={styles.response}>
    <div className={styles.responseTitle}>
      <h3>Response</h3>
      <Badge color={statusColor(result.status)} variant="light">
        {result.status} {result.statusText}
      </Badge>
    </div>
    <dl className={styles.headers}>
      {result.redirected && (
        <>
          <dt>Redirect</dt><dd>已跟随重定向；以下是最终响应</dd>
          <dt>Final URL</dt><dd>{result.finalUrl}</dd>
        </>
      )}
      <dt>Content-Type</dt><dd>{result.contentType}</dd>
      <dt>Content-Disposition</dt><dd>{result.disposition}</dd>
      <dt>Location</dt><dd>{result.location}</dd>
    </dl>
    <div className={styles.interpretation}>
      <h3>为什么得到这个结果</h3>
      <p>{interpretation}</p>
    </div>
    <h3>Body</h3>
    {result.body ? <pre className={styles.body}>{result.body}</pre> : <div className={styles.noBody}>响应体为空</div>}
    {showPreview && result.body && (
      <iframe className={styles.preview} sandbox="" srcDoc={result.body} title="渲染后的 HTML 预览" />
    )}
  </div>
);

export default ResponseResult;
