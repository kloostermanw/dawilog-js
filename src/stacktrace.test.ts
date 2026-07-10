import { describe, it, expect } from 'vitest';
import { framesFromError } from './stacktrace';

describe('framesFromError', () => {
  it('maps a parsed frame into the dawilog frame shape', () => {
    const err = new Error('boom');
    err.stack = [
      'Error: boom',
      '    at handleClick (https://app.example.com/main.js:42:13)',
    ].join('\n');

    const frames = framesFromError(err);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toEqual({
      file: 'https://app.example.com/main.js',
      line: 42,
      column: 13,
      function: 'handleClick',
      class: '',
      args: [],
      code: {},
    });
  });

  it('returns an empty array when there is no usable stack', () => {
    const err = new Error('no stack');
    err.stack = undefined;
    expect(framesFromError(err)).toEqual([]);
  });
});
