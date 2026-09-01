export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [name, domain] = parts;
  const maskedName =
    name.length > 2
      ? `${name[0]}***${name[name.length - 1]}`
      : `${name[0] ?? ''}***`;
  return `${maskedName}@${domain}`;
}

export interface SignUpLogPayload {
  readonly action: string;
  readonly maskedEmail?: string;
  readonly requestId: string;
  readonly message: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly details?: Record<string, unknown>;
}

export function logSignUpTelemetry(payload: SignUpLogPayload): void {
  if (process.env.NODE_ENV !== 'production') {
    const entry = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    if (payload.level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (payload.level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}

export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
