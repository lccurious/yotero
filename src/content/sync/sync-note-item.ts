import { YuqueClient } from './yuque-client';
import { LocalizableError } from '../errors';
import { logger } from '../utils';
import { saveYuqueLinkAttachment } from '../data/item-data';

/**
 * Sync a Zotero note item to Yuque.
 *
 * @param noteItem the Zotero note item to sync to Yuque
 * @param params any additional parameters needed for the sync process
 */
export async function syncNoteItem(
  noteItem: Zotero.Item,
  params: any,
): Promise<void> {
  if (noteItem.isTopLevelItem()) {
    throw new LocalizableError(
      'Cannot sync note without a parent item',
      'notero-error-note-without-parent',
    );
  }

  const regularItem = noteItem.topLevelItem;
  const yuqueClient = new YuqueClient();

  try {
    // 获取笔记内容
    const noteContent = noteItem.getNote();
    const noteTitle = noteItem.getNoteTitle();

    // 创建或更新语雀文档
    const response = await yuqueClient.createDoc(
      noteTitle,
      noteContent
    );

    // 保存语雀文档链接
    await saveYuqueLinkAttachment(noteItem, response.data.slug);
  } catch (error) {
    logger.error('Failed to sync note to Yuque:', error);
    throw new LocalizableError(
      'Failed to sync note to Yuque',
      'notero-error-yuque-sync-failed',
      { cause: error }
    );
  }
}
