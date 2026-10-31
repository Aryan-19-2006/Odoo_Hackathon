declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | ArrayBufferView;
  export type SQLOutputValue = null | number | bigint | string | Uint8Array;

  export interface StatementSync {
    all(...values: SQLInputValue[]): Record<string, SQLOutputValue>[];
    get(...values: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...values: SQLInputValue[]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}