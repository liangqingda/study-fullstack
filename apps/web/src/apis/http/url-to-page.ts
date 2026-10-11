/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type {
  UrlToPageLoadRequest,
  UrlToPageLoadResponse,
} from '@liangqingda/study-nodejs-schema';
import { post } from '@/utils/http';

export const postApiUrlToPageLoad = (input: {
  body: UrlToPageLoadRequest;
  signal?: AbortSignal;
}) =>
  post<UrlToPageLoadResponse>('/api/http/url-to-page/load', input.body, {
    signal: input.signal,
  });
