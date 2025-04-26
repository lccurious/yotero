import { FluentMessageId } from '../../locale/fluent-types';
import { ErrorL10nId, LocalizableError } from '../errors';
import { logger } from '../utils';

export class FindDuplicatesError extends LocalizableError {
  public constructor(message: string, l10nId: ErrorL10nId) {
    super(message, l10nId);
    Object.defineProperty(this, 'name', { value: 'FindDuplicatesError' });
  }
}

export async function findDuplicateItems(): Promise<never> {
  throw new FindDuplicatesError(
    'Finding duplicate items is no longer supported',
    'notero-error-find-duplicates-not-supported' as ErrorL10nId,
  );
}
