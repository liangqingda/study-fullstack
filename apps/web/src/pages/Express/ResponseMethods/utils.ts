import { basePath } from './constants';

export const methodUrl = (slug: string) =>
  `${basePath}/${slug}${slug === 'jsonp' ? '?callback=showResponse' : ''}`;
