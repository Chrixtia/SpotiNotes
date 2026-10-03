/**
 * @fileoverview SpotiNotes - ST-FCA Type Declarations
 *
 * @description Ambient TypeScript module definitions for the unofficial stfca Facebook Chat API library.
 * @author @Chrixtia
 */

declare module 'stfca' {
  export interface AppStateCookie {
    key: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number | string;
    [key: string]: unknown;
  }

  export interface ApiOptions {
    listenEvents?: boolean;
    selfListen?: boolean;
    [key: string]: unknown;
  }

  export interface StfcaApi {
    setOptions(options: ApiOptions): void;
    httpPost?(
      url: string,
      form: Record<string, unknown>,
      callback: (err: Error | null, data?: any) => void
    ): void;
    createNote?(
      text: string,
      callback: (err?: Error | null, result?: any) => void
    ): void;
    [key: string]: any;
  }

  export type LoginCredentials = {
    appState: AppStateCookie[];
    [key: string]: unknown;
  };

  export type LoginCallback = (err: Error | null, api: StfcaApi) => void;

  function login(credentials: LoginCredentials, callback: LoginCallback): void;

  export = login;
}
