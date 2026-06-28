export interface DatasetEntry {
  id: string;
  input: string;
  output: string;
  category?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  baseModel: string;
  serviceTask: string;
  systemInstructions: string;
  optimizedInstructions?: string;
  optimizedExemplars?: DatasetEntry[];
  dataset: DatasetEntry[];
  status: 'untrained' | 'training' | 'trained';
  createdAt: string;
  lastTrainedAt?: string;
}

export interface FineTuneJob {
  agentId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  epoch: number;
  totalEpochs: number;
  learningRate: number;
  currentLoss: number;
  currentAccuracy: number;
  logs: string[];
  lossHistory: { epoch: number; loss: number; accuracy: number }[];
}

export interface EvalReport {
  agentId: string;
  evaluatedAt: string;
  avgScorePre: number;
  avgScorePost: number;
  metrics: {
    accuracy: { pre: number; post: number };
    tone: { pre: number; post: number };
    latency: { pre: number; post: number };
    compliance: { pre: number; post: number };
  };
  examples: {
    id: string;
    input: string;
    expected: string;
    preOutput: string;
    postOutput: string;
    preFeedback: string;
    postFeedback: string;
    preScore: number;
    postScore: number;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent_pre' | 'agent_post';
  text: string;
  timestamp: string;
}
