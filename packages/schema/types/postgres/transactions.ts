// start of generated types
export type TransactionRunRequest = {
  scenario: TransactionScenario;
};

export type TransactionScenario =
  | 'atomicity'
  | 'savepoint'
  | 'read-committed'
  | 'repeatable-read'
  | 'write-skew'
  | 'serializable';

export type TransactionStep = {
  session: string;
  action: string;
  observation: string;
  sqlstate?: string;
};

export type TransactionRunResponse = {
  scenario: TransactionScenario;
  database: 'study_nodejs';
  steps: TransactionStep[];
  final: {
    [key: string]: number;
  };
  outcome: string;
};

export type TransactionError = {
  error: string;
};
