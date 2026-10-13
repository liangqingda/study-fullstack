/* eslint-disable */
// Generated from @study-lab/schema. Do not edit.
import type {
  UrlToPageLoadRequest,
  UrlToPageLoadResponse,
} from '@study-lab/schema';
import { post } from '@/utils/http';

export const postApiHttpUrlToPageLoad = (input: {
  body: UrlToPageLoadRequest;
  signal?: AbortSignal;
}) =>
  post<UrlToPageLoadResponse>('/api/tech/http/url-to-page/load', input.body, {
    signal: input.signal,
  });
