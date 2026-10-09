import { useEffect, useRef, useState } from 'react';

/**
 * 一次 fetch 请求的响应摘要。
 */
export type Result = {
  /** HTTP 状态码。 */
  status: number;
  /** 状态码描述。 */
  statusText: string;
  /** Content-Type 响应头。 */
  contentType: string;
  /** Content-Disposition 响应头。 */
  disposition: string;
  /** Location 响应头。 */
  location: string;
  /** 响应体文本。 */
  body: string;
  /** 是否发生了重定向。 */
  redirected: boolean;
  /** 重定向后的最终 URL。 */
  finalUrl: string;
};

/**
 * 发起 fetch 请求并管理 loading / error / result 状态，自动取消未完成的请求。
 */
export const useResponseRequest = () => {
  const controllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  /** 取消当前请求并清空所有状态。 */
  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(null);
    setError('');
    setLoading(false);
  };

  /** 发起一次请求，自动 abort 上一个未完成的请求。 */
  const run = async (url: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();

    controllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.text();

      if (controllerRef.current !== controller) {
        return;
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type') ?? '—',
        disposition: response.headers.get('content-disposition') ?? '—',
        location: response.headers.get('location') ?? '—',
        body,
        redirected: response.redirected,
        finalUrl: response.url,
      });
    } catch {
      if (controllerRef.current === controller && !controller.signal.aborted) {
        setResult(null);
        setError('请求失败。请确认后端已在 localhost:3000 启动。');
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  };

  return { result, error, loading, reset, run };
};
