import { PageTitleFormat } from '../prefs/notero-pref';
import { logger } from '../utils';
import type { SyncJobParams } from './sync-job';
import { YuqueClient } from './yuque-client';

declare const Zotero: {
  QuickCopy: {
    getContentFromItems: (items: unknown[], format: string) => Promise<{ text: string }>;
  };
};

interface ZoteroItem {
  getField: (field: string) => string | undefined;
  getCreators: () => Array<{ firstName?: string; lastName?: string }>;
}

export async function syncRegularItem(
  item: ZoteroItem,
  params: SyncJobParams,
): Promise<void> {
  const { yuque, citationFormat, pageTitleFormat } = params;

  try {
    // Get item data
    const title = item.getField('title') || '';
    const abstract = item.getField('abstractNote') || '';
    const creators = item.getCreators() || [];
    const authors = creators.map((creator) => 
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
    const docData = {
      title: pageTitle,
      slug: pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      body: content,
      format: 'lake'
    };
    const response = await yuque.createDoc(yuque.namespace, docData);
    logger.log('Successfully synced item to Yuque:', response.data.id);
  } catch (error) {
    logger.error('Failed to sync item to Yuque:', error);
    throw error;
  }
}
