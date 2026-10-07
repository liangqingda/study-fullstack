// start of generated types
/* eslint-disable quotes */
export type SendCodeRequest = {
    phone: string;
};

export type SendCodeResponse = {
    phone: string;
    code: string;
    ttlSeconds: number;
};

export type SendCodeRateLimited = {
    error: string;
    retryAfterSeconds: number;
};

export type LoginRequest = {
    phone: string;
    code: string;
};

export type LoginResponse = {
    token: string;
    phone: string;
    expiresInSeconds: number;
};

export type MeResponse = {
    phone: string;
    token: string;
    remainingSeconds: number;
    refreshed: boolean;
};

export type LogoutResponse = {
    ok: boolean;
};

export type SessionEntry = {
    phone: string;
    token: string;
    remainingSeconds: number;
};

export type SessionsResponse = {
    count: number;
    sessions: SessionEntry[];
};

export type SmsLoginError = {
    error: string;
};

export type TransactionRunRequest = {
    scenario: TransactionScenario;
};

export type TransactionScenario = "atomicity" | "savepoint" | "read-committed" | "repeatable-read" | "write-skew" | "serializable";

export type TransactionStep = {
    session: string;
    action: string;
    observation: string;
    sqlstate?: string;
};

export type TransactionRunResponse = {
    scenario: TransactionScenario;
    database: "study_nodejs";
    steps: TransactionStep[];
    final: {
        [key: string]: number;
    };
    outcome: string;
};

export type TransactionError = {
    error: string;
};
