import { YuqueClient } from './yuque-client';

import { APA_STYLE } from '../constants';
import { ItemSyncError } from '../errors';
import {
  NoteroPref,
  PageTitleFormat,
  getNoteroPref,
  getRequiredNoteroPref,
} from '../prefs/notero-pref';
import { getLocalizedErrorMessage, logger } from '../utils';

import { ProgressWindow } from './progress-window';
import { syncNoteItem } from './sync-note-item';
import { syncRegularItem } from './sync-regular-item';

export type SyncJobParams = {
  citationFormat: string;
  yuque: YuqueClient;
  pageTitleFormat: PageTitleFormat;
};

export async function performSyncJob(
  itemIDs: Set<Zotero.Item['id']>,
  window: Window,
): Promise<void> {
  const items = Zotero.Items.get(Array.from(itemIDs));
  if (!items.length) return;

  const progressWindow = new ProgressWindow(items.length, window);
  await progressWindow.show();

  try {
    const params = await prepareSyncJob(window);
    await syncItems(items, progressWindow, params);
  } catch (error) {
    await handleError(error, progressWindow, window);
  }
}

async function prepareSyncJob(window: Window): Promise<SyncJobParams> {
  const yuque = new YuqueClient();
  const citationFormat = getCitationFormat();
  const pageTitleFormat = getPageTitleFormat();

  return {
    citationFormat,
    yuque,
    pageTitleFormat,
  };
}

function getCitationFormat(): string {
  const format = Zotero.Prefs.get('export.quickCopy.setting');

  if (typeof format === 'string' && format) return format;

  return APA_STYLE;
}

function getPageTitleFormat(): PageTitleFormat {
  return getNoteroPref(NoteroPref.pageTitleFormat) || PageTitleFormat.itemTitle;
}

async function syncItems(
  items: Zotero.Item[],
  progressWindow: ProgressWindow,
  params: SyncJobParams,
) {
  for (const [index, item] of items.entries()) {
    const step = index + 1;
    logger.groupCollapsed(
      `Syncing item ${step} of ${items.length} with ID`,
      item.id,
    );
    logger.debug(item.getDisplayTitle());

    await progressWindow.updateText(step);

    try {
      if (item.isNote()) {
        await syncNoteItem(item, params.yuque);
      } else {
        await syncRegularItem(item, params);
      }
    } catch (error) {
      logger.error('Sync failed for item:', item.getDisplayTitle(), error);
      throw new ItemSyncError(error instanceof Error ? error.message : String(error), item);
    } finally {
      logger.groupEnd();
    }

    progressWindow.updateProgress(step);
  }

  progressWindow.complete();
}

async function handleError(
  error: unknown,
  progressWindow: ProgressWindow,
  window: Window,
) {
  let errorMessage: string;
  let failedItem: Zotero.Item | undefined;

  if (error instanceof ItemSyncError) {
    errorMessage = error.message;
    failedItem = error.item;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = String(error);
  }

  logger.error('Sync job failed:', errorMessage, failedItem?.getDisplayTitle());

  try {
    const localizedMessage = await getLocalizedErrorMessage(
      errorMessage,
      window.document.l10n,
    );
    progressWindow.fail(localizedMessage, failedItem);
  } catch (localizationError) {
    logger.error('Failed to localize error message:', localizationError);
    progressWindow.fail(errorMessage, failedItem);
  }
}
