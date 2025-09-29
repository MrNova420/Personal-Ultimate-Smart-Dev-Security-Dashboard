// Basic Node.js type definitions for TypeScript compilation
// This is a temporary stub until @types/node is properly installed

declare global {
  const Buffer: {
    from(data: string | number[], encoding?: string): Buffer;
    isBuffer(obj: any): obj is Buffer;
    alloc(size: number): Buffer;
  };
  
  const process: {
    cwd(): string;
    env: { [key: string]: string | undefined };
    memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number };
    cpuUsage(): { user: number; system: number };
    uptime(): number;
    on(event: string, callback: (error: Error) => void): void;
    exit(code?: number): void;
  };
  
  const global: {
    setInterval: (callback: () => void, delay: number) => any;
    clearInterval: (id: any) => void;
    setTimeout: (callback: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  
  namespace NodeJS {
    interface Timeout {
      ref(): void;
      unref(): void;
    }
  }
}

interface Buffer {
  length: number;
  toString(encoding?: string): string;
}

// Basic EventEmitter implementation
declare class EventEmitter {
  emit(eventName: string, ...args: any[]): boolean;
  on(eventName: string, listener: (...args: any[]) => void): this;
  once(eventName: string, listener: (...args: any[]) => void): this;
  removeListener(eventName: string, listener: (...args: any[]) => void): this;
  removeAllListeners(eventName?: string): this;
}

// Basic Express types
declare module 'express' {
  export interface Request {
    method: string;
    originalUrl: string;
    ip: string;
    user?: any;
    sessionID?: string;
    get(name: string): string | undefined;
    body: any;
    params: any;
    query: any;
  }
  
  export interface Response {
    status(code: number): Response;
    json(obj: any): Response;
    send(data: any): Response;
    setHeader(name: string, value: string): void;
  }
  
  export interface NextFunction {
    (error?: any): void;
  }
  
  export interface Router {
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
    use(...args: any[]): Router;
  }
  
  export function Router(): Router;
}

// Basic crypto module
declare module 'crypto' {
  export function createHash(algorithm: string): {
    update(data: string | Buffer): any;
    digest(encoding?: string): string;
  };
  export function createHmac(algorithm: string, key: any): {
    update(data: string | Buffer): any;
    digest(encoding?: string): string;
  };
  export function randomBytes(size: number): Buffer;
  export function createCipher(algorithm: string, password: any): any;
  export function createDecipher(algorithm: string, password: any): any;
  export function createCipheriv(algorithm: string, key: any, iv: any): {
    update(data: string | Buffer): Buffer;
    final(): Buffer;
    setAAD(buffer: Buffer): void;
    getAuthTag(): Buffer;
  };
  export function createDecipheriv(algorithm: string, key: any, iv: any): {
    update(data: Buffer): Buffer;
    final(): Buffer;
    setAAD(buffer: Buffer): void;
    setAuthTag(tag: Buffer): void;
  };
}

// Basic events module
declare module 'events' {
  export { EventEmitter };
}

// Basic axios types
declare module 'axios' {
  interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
  }
  
  function axios(config: any): Promise<AxiosResponse>;
  export default axios;
  export { AxiosResponse };
}

// Basic express-rate-limit
declare module 'express-rate-limit' {
  function rateLimit(options: {
    windowMs?: number;
    max?: number | ((req: any) => number);
    message?: string | object;
    keyGenerator?: (req: any) => string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    [key: string]: any;
  }): any;
  export default rateLimit;
}

export {};