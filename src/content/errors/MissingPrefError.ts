import type { NoteroPref } from '../prefs/notero-pref';

import { ErrorL10nId, LocalizableError } from './LocalizableError';

const L10N_IDS: Partial<Record<NoteroPref, ErrorL10nId>> = {
  yuqueBaseUrl: 'notero-error-missing-yuque-base-url',
  yuqueGroupLogin: 'notero-error-missing-yuque-group-login',
  yuqueBookSlug: 'notero-error-missing-yuque-book-slug',
  yuqueToken: 'notero-error-missing-yuque-token',
};

export class MissingPrefError extends LocalizableError {
  public readonly name = 'MissingPrefError';

  public constructor(pref: NoteroPref) {
    const l10nId = L10N_IDS[pref];
    if (!l10nId) {
      throw new Error(`No error message defined for missing pref: ${pref}`);
    }
    super(`Missing pref: ${pref}`, l10nId);
  }
}
