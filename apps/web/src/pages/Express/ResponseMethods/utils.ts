import { BASE_PATH } from './constants';

export const methodUrl = (slug: string) =>
  `${BASE_PATH}/${slug}${slug === 'jsonp' ? '?callback=showResponse' : ''}`;
