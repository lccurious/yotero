import { YuqueClient } from './yuque-client';
import { logger } from '../utils';
import type { SyncJobParams } from './sync-job';
import { PageTitleFormat } from '../prefs/notero-pref';

declare const Zotero: any;

export async function syncRegularItem(
  item: any,
  params: SyncJobParams,
): Promise<void> {
  const { yuque, citationFormat, pageTitleFormat } = params;

  try {
    // Get item data
    const title = item.getField('title') || '';
    const abstract = item.getField('abstractNote') || '';
    const authors = item.getCreators().map((creator: any) => 
      `${creator.firstName || ''} ${creator.lastName || ''}`
    ).join(', ');
    const date = item.getField('date') || '';
    const url = item.getField('url') || '';
    const citation = await Zotero.QuickCopy.getContentFromItems(
      [item],
      citationFormat,
    );

    // Create lake format content
    const content = yuque.createLakeContent(
      title,
      abstract,
      authors,
      date,
      url,
      typeof citation === 'boolean' ? '' : citation.text
    );

    // Get page title based on format
    let pageTitle = title;
    if (pageTitleFormat === PageTitleFormat.itemAuthorDateCitation) {
      const creators = item.getCreators();
      if (creators.length > 0) {
        const firstCreator = creators[0];
        if (firstCreator) {
          const lastName = firstCreator.lastName || '';
          const year = date.split('-')[0] || '';
          if (lastName && year) {
            pageTitle = `${lastName}, ${year}`;
          }
        }
      }
    }

    // Create document in Yuque
    const response = await yuque.createDoc(pageTitle, content);
    logger.log('Successfully synced item to Yuque:', response.data.id);
  } catch (error) {
    logger.error('Failed to sync item to Yuque:', error);
    throw error;
  }
}
