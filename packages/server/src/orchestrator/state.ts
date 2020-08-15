import { Test, TestResult, ResultStatus } from '@bigtest/suite';
import { BundlerError, BundlerWarning } from '@bigtest/bundler';

export type AgentState = {
  agentId: string;
  browser?: {
    name: string;
    version: string;
  };
  os?: {
    name: string;
    version: string;
    versionName: string;
  };
  platform?: {
    type: string;
    vendor: string;
  };
  engine?: {
    name: string;
    version: string;
  };
}

export type TestRunState = {
  testRunId: string;
  status: ResultStatus;
  agents: Record<string, TestRunAgentState>;
}

export type TestRunAgentState = {
  status: ResultStatus;
  agent: AgentState;
  result: TestResult;
}

export type BundlerState = 
  | { kind: 'UNBUNDLED' } 
  | { kind: 'BUILDING'; warnings: BundlerWarning[] } 
  | { kind: 'GREEN'; path: string;  warnings: BundlerWarning[] }
  | { kind: 'ERRORED'; error: BundlerError }

export interface Manifest extends Test {
  fileName: string;
}

export type OrchestratorState = {
  agents: Record<string, AgentState>;
  manifest: Manifest;
  bundler: BundlerState;
  testRuns: Record<string, TestRunState>;
}
