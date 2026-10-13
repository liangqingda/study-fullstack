type StructureFile = {
  /** 源码相对仓库根目录的路径。 */
  path: string;
  /** 该文件在本 Demo 中的职责说明。 */
  role: string;
};

type DemoStructure = {
  frontend: StructureFile[];
  backend?: StructureFile[];
  schema?: StructureFile[];
  connection?: string;
  database: string;
};

type DemoStructureDialogProps = {
  structure: DemoStructure;
};

type Directory = {
  name: string;
  directories: Map<string, Directory>;
  files: Map<string, StructureFile>;
};

type Repository = 'frontend' | 'backend' | 'schema';

type TreeProps = {
  directory: Directory;
  repository: Repository;
  readFiles: Record<string, boolean>;
};

type FileReviewProps = {
  file: StructureFile;
  repository: Repository;
  read: boolean;
  onReadChange: (read: boolean) => void;
};

export type {
  DemoStructure,
  DemoStructureDialogProps,
  Directory,
  FileReviewProps,
  Repository,
  StructureFile,
  TreeProps,
};
