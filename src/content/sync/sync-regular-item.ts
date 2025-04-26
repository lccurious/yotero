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

function getContentHash(content: string): string {
  // Simple hash function to generate a hash from content
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
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
      slug: getContentHash(content), // Use first 8 chars of content hash as slug
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
