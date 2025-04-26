import { MissingPrefError } from '../errors';
import { logger } from '../utils';

export class NotionClientError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NotionClientError';
  }
}

export function getNotionClient(): never {
  throw new NotionClientError('Notion client is no longer supported');
}
