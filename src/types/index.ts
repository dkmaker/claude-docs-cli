// Core CLI types
export interface CLIProgram {
  name: string;
  version: string;
  description: string;
  commands: Command[];
}

export interface Command {
  name: string;
  description: string;
  options: Option[];
  arguments: Argument[];
  handler: CommandHandler;
  aliases?: string[];
}

export type CommandHandler = (...args: unknown[]) => Promise<void>;

export interface Option {
  flags: string;
  description: string;
  defaultValue?: unknown;
  required?: boolean;
  variadic?: boolean;
}

export interface Argument {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
  defaultValue?: unknown;
}

// Logging types
export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

// Configuration types (placeholder for future phases)
export interface AppConfig {
  docsDir: string;
  cacheDir: string;
  jsonFile: string;
  cacheVersion: string;
}
