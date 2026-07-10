import ErrorStackParser from 'error-stack-parser';
import type { StackFrame } from './types';

export function framesFromError(error: Error): StackFrame[] {
  let parsed;
  try {
    parsed = ErrorStackParser.parse(error);
  } catch {
    return [];
  }
  return parsed.map((f) => ({
    file: f.fileName ?? '',
    line: f.lineNumber ?? 0,
    column: f.columnNumber,
    function: f.functionName ?? '',
    class: '',
    args: [],
    code: {},
  }));
}
