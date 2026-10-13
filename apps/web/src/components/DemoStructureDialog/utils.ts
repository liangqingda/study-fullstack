import type { Directory, Repository, StructureFile } from './types';

import { MIN_SIDEBAR_WIDTH } from './constants';

/** 把扁平的源码文件列表按路径构建成目录树。 */
const buildTree = (files: StructureFile[]): Directory => {
  const root: Directory = {
    name: '',
    directories: new Map(),
    files: new Map(),
  };

  for (const { path, role } of files) {
    const segments = path.split('/');
    const name = segments[segments.length - 1];
    let directory = root;

    for (const segment of segments.slice(0, -1)) {
      let child = directory.directories.get(segment);

      if (!child) {
        child = { name: segment, directories: new Map(), files: new Map() };
        directory.directories.set(segment, child);
      }

      directory = child;
    }

    if (name) {
      directory.files.set(name, { path, role });
    }
  }

  return root;
};

/** 已读标记在全局状态的键：`<repository>:<path>`。 */
const fileKey = (repository: Repository, path: string) =>
  `${repository}:${path}`;

/** 每个文件的 DOM 锚点 id，供目录树点击跳转到审阅区对应文件。 */
const fileId = (repository: Repository, path: string) =>
  `demo-source-${encodeURIComponent(fileKey(repository, path))}`;

/** 文件树侧栏的最大宽度（px），受窗口尺寸约束。 */
const maxSidebarWidth = () =>
  Math.max(MIN_SIDEBAR_WIDTH, Math.min(720, window.innerWidth - 320));

/** 把目标宽度收敛到可用的最小/最大区间内。 */
const clampSidebarWidth = (width: number) =>
  Math.min(maxSidebarWidth(), Math.max(MIN_SIDEBAR_WIDTH, width));

export { buildTree, clampSidebarWidth, fileId, fileKey, maxSidebarWidth };
