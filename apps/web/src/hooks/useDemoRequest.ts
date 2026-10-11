import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 基于 AbortController 的一次性异步请求状态管理 hook。
 *
 * 统一处理多个 demo 页面反复出现的请求骨架：
 * - 新请求自动取消上一个未完成的请求（竞态守卫）；
 * - 组件卸载时中止进行中的请求，避免卸载后 setState；
 * - 维护 loading / error / result 三态。
 *
 * 页面只需传入一个接收 AbortSignal 的异步任务函数，请求细节（fetch、
 * axios、错误文案、超时）全部留在任务函数内，便于按页面差异化定制。
 *
 * 用法：
 * ```ts
 * const { result, error, loading, reset, run } = useDemoRequest<MyResult>();
 *
 * run(async (signal) => {
 *   const response = await fetch(url, { signal });
 *   return await response.json();
 * });
 * ```
 */
export type DemoRequestResult<T> = {
  /** 最近一次成功结果；尚未请求或失败后为 null。 */
  result: T | null;
  /** 最近一次错误消息；无错误时为空串。 */
  error: string;
  /** 是否正在请求中。 */
  loading: boolean;
  /** 取消当前请求并清空 result / error / loading。 */
  reset: () => void;
  /**
   * 发起一次请求。task 收到的 AbortSignal 会与“当前请求”绑定：
   * 再次调用 run、reset 或组件卸载时该信号会被中止，task 内应把它传给 fetch / axios。
   * task 内 throw 的 Error 会被捕获并写入 error；因主动取消而中止的请求不会写入 error。
   */
  run: (task: (signal: AbortSignal) => Promise<T>) => Promise<void>;
};

export const useDemoRequest = <T>(): DemoRequestResult<T> => {
  const controllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 组件卸载时中止进行中的请求。
  useEffect(() => () => controllerRef.current?.abort(), []);

  /** 取消当前请求并清空所有状态。 */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(null);
    setError('');
    setLoading(false);
  }, []);

  /** 发起请求：自动中止上一个未完成请求，仅当当前请求仍是最新时才更新状态。 */
  const run = useCallback(async (task: (signal: AbortSignal) => Promise<T>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();

    controllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const next = await task(controller.signal);

      // 竞态守卫：请求期间又发起了新请求或调用了 reset，则丢弃本次结果。
      if (controllerRef.current !== controller) {
        return;
      }

      setResult(next);
    } catch (cause) {
      // 仅当本请求仍是最新、且不是被主动中止（切换/卸载）时才记录错误。
      if (controllerRef.current === controller && !controller.signal.aborted) {
        setResult(null);
        setError(cause instanceof Error ? cause.message : '请求失败');
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  return { result, error, loading, reset, run };
};
