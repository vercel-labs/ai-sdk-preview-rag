// LiveKit Agent Event Types
export type AgentState = 'initializing' | 'listening' | 'thinking' | 'speaking';
export type UserState = 'speaking' | 'listening' | 'away';

// Base event interface
export interface AgentEvent {
  type: string;
  timestamp: number;
}

// Agent state change event
export interface AgentStateChangedEvent extends AgentEvent {
  type: 'agent_state_changed';
  oldState: AgentState;
  newState: AgentState;
}

// User state change event
export interface UserStateChangedEvent extends AgentEvent {
  type: 'user_state_changed';
  oldState: UserState;
  newState: UserState;
}

// User input transcription event
export interface UserInputTranscribedEvent extends AgentEvent {
  type: 'user_input_transcribed';
  transcript: string;
  language: string;
  isFinal: boolean;
  speakerId?: string;
}

// Tool execution events
export interface ToolStartEvent extends AgentEvent {
  type: 'tool_start';
  id: string;
  tool: string;
  params: any;
}

export interface ToolEndEvent extends AgentEvent {
  type: 'tool_end';
  id: string;
  tool: string;
  result: any;
}

export interface ToolErrorEvent extends AgentEvent {
  type: 'tool_error';
  id: string; 
  tool: string;
  error: string;
}

// Batch tool execution event
export interface FunctionToolsExecutedEvent extends AgentEvent {
  type: 'function_tools_executed';
  toolCalls: Array<{
    name: string;
    callId: string;
    output: any;
    input?: any;
  }>;
}

// Modality change event
export interface ModalityChangeEvent extends AgentEvent {
  type: 'modality_change';
  from: 'text' | 'voice';
  to: 'text' | 'voice';
}

// Conversation item added event
export interface ConversationItemAddedEvent extends AgentEvent {
  type: 'conversation_item_added';
  role: 'user' | 'assistant';
  content: string;
  interrupted: boolean;
}

// Error event
export interface ErrorEvent extends AgentEvent {
  type: 'error';
  recoverable: boolean;
  message: string;
  source: string;
}

// Session closed event
export interface SessionClosedEvent extends AgentEvent {
  type: 'session_closed';
  error?: string;
}

// Union type for all agent events
export type AgentEventType =
  | AgentStateChangedEvent
  | UserStateChangedEvent
  | UserInputTranscribedEvent
  | ToolStartEvent
  | ToolEndEvent
  | ToolErrorEvent
  | FunctionToolsExecutedEvent
  | ModalityChangeEvent
  | ConversationItemAddedEvent
  | ErrorEvent
  | SessionClosedEvent;

// Chat message types for data channel
export interface UserChatMessage {
  type: 'chat_message';
  content: string;
  timestamp: number;
}

export interface AgentChatMessage {
  type: 'agent_message';
  content: string;
  messageId: string;
  timestamp: number;
}

export type ChatMessageType = UserChatMessage | AgentChatMessage;

// Session configuration that can be updated
export interface SessionConfig {
  model: 'low' | 'high';
  effort: 'low' | 'medium' | 'high';
  selectedCategories: string[];
  talkWithPage: boolean;
  pageUrl: string;
  pageTitle: string;
  browserHistory?: string[];
  modality: 'text' | 'voice';
}

// Client-to-agent events (sent via data channel)
export interface RestoreHistoryEvent {
  type: 'restore_history';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
  }>;
}

export interface SessionConfigUpdateEvent {
  type: 'session_config_update';
  config: Partial<SessionConfig>;
  timestamp: number;
}

export interface ClearHistoryEvent {
  type: 'clear_history';
  timestamp: number;
}

export type ClientToAgentEvent = RestoreHistoryEvent | SessionConfigUpdateEvent | ClearHistoryEvent;

// LiveKit connection metadata
export interface LiveKitConnectionMetadata {
  pageUrl: string;
  pageTitle: string;
  browserHistory?: string[];
  model: 'low' | 'high';
  effort: 'low' | 'medium' | 'high';
  selectedCategories: string[];
  talkWithPage: boolean;
  modality: 'text' | 'voice';
}

// Connection state
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  error?: string;
  token?: string;
  url?: string;
}

