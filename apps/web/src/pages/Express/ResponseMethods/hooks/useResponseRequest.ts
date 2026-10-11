import { useCallback } from 'react';

import { useDemoRequest } from '@/hooks/useDemoRequest';

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
 *
 * 基于公共 hook `useDemoRequest` 封装：请求骨架（AbortController、竞态守卫、
 * 卸载中止、三态）由公共 hook 提供，这里仅补充“把 URL 抓取为 Result”的页面逻辑。
 */
export const useResponseRequest = () => {
  const { result, error, loading, reset, run } = useDemoRequest<Result>();

  /** 发起一次 fetch 请求，自动 abort 上一个未完成的请求。 */
  const runUrl = useCallback(
    (url: string) => {
      void run(async (signal) => {
        try {
          const response = await fetch(url, { signal });
          const body = await response.text();

          return {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type') ?? '—',
            disposition: response.headers.get('content-disposition') ?? '—',
            location: response.headers.get('location') ?? '—',
            body,
            redirected: response.redirected,
            finalUrl: response.url,
          };
        } catch (cause) {
          if (signal.aborted) {
            throw cause;
          }

          throw new Error('请求失败。请确认后端已在 localhost:3000 启动。');
        }
      });
    },
    [run],
  );

  return { result, error, loading, reset, run: runUrl };
};
