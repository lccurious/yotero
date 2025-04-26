import { YuqueClient } from './yuque-client';
import { createLakeContent } from './yuque-content-builder';
import { LocalizableError } from '../errors';
import { logger } from '../utils';
import { saveYuqueLinkAttachment } from '../data/item-data';

export async function syncToYuque(item: Zotero.Item): Promise<void> {
  const yuque = new YuqueClient();

  // 获取项目信息
  const title = item.getField('title');
  const abstract = item.getField('abstractNote') || '';
  const authors = item.getCreators()
    .map(creator => `${creator.firstName} ${creator.lastName}`.trim())
    .join(', ');
  const year = item.getField('date')?.split('-')[0] || '';
  const url = item.getField('url') || '';
  
  // 获取引用格式
  const citation = await Zotero.QuickCopy.getContentFromItems(
    [item],
    'bibliography',
    'text',
    { format: 'text' }
  );

  // 生成语雀文档内容
  const content = createLakeContent({
    title,
    abstract,
    authors,
    year,
    url,
    citation,
  });

  try {
    // 创建语雀文档
    const response = await yuque.createDoc(title, content);
    
    // 保存语雀链接
    const yuqueUrl = `https://yuque.com/${yuque.groupLogin}/${yuque.bookSlug}/${response.data.slug}`;
    await saveYuqueLinkAttachment(item, yuqueUrl);

    logger.debug('Successfully synced item to Yuque:', {
      itemId: item.id,
      yuqueDocId: response.data.id,
      yuqueUrl,
    });
  } catch (error) {
    logger.error('Failed to sync item to Yuque:', error);
    throw new LocalizableError(
      'Failed to sync item to Yuque',
      'notero-error-yuque-sync-failed',
    );
  }
} 