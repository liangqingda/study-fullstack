import axios from 'axios';

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export const http = axios.create({ baseURL: '/' });

export const request = <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
  http.request<T>(config);

export const buildPath = (template: string, params: Record<string, string | number | null | undefined>): string =>
  template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name];

    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter: ${name}`);
    }

    return encodeURIComponent(String(value));
  });

export { isAxiosError } from 'axios';
