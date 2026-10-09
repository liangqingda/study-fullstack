import { BASE_PATH } from './constants';

/** 根据方法 slug 构造请求 URL，jsonp 方法额外拼 callback 参数。 */
export const methodUrl = (slug: string) =>
  `${BASE_PATH}/${slug}${slug === 'jsonp' ? '?callback=showResponse' : ''}`;
