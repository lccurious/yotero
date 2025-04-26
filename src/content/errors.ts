import { LocalizableError as BaseLocalizableError } from './errors/LocalizableError';
import type { ErrorL10nId } from './errors/LocalizableError';

export class LocalizableError extends BaseLocalizableError {
  constructor(message: string, l10nId: ErrorL10nId) {
    super(message, l10nId);
  }
}

export class MissingPrefError extends LocalizableError {
  constructor(pref: string) {
    super(`Missing required preference: ${pref}`, `notero-error-missing-pref`);
  }
}

export class ItemSyncError extends LocalizableError {
  constructor(message: string) {
    super(message, 'notero-error-item-sync-failed');
  }
}

export const ERROR_L10N_IDS = {
  'notero-error-missing-yuque-base-url': 'notero-error-missing-yuque-base-url',
  'notero-error-missing-yuque-group-login': 'notero-error-missing-yuque-group-login',
  'notero-error-missing-yuque-book-slug': 'notero-error-missing-yuque-book-slug',
  'notero-error-missing-yuque-token': 'notero-error-missing-yuque-token',
  'notero-error-yuque-sync-failed': 'notero-error-yuque-sync-failed',
  'notero-error-missing-pref': 'notero-error-missing-pref',
  'notero-error-item-sync-failed': 'notero-error-item-sync-failed',
} as const; 