declare const Zotero: any;

// Add type definition for Zotero's extended Document
interface ZoteroDocument extends Document {
  createXULElement(tagName: string): Element;
}

// Add type definition for Zotero creator
interface ZoteroCreator {
  firstName: string;
  lastName: string;
}

export const logger = {
  debug: (...args: any[]) => Zotero.debug('Notero: ' + args.join(' ')),
  error: (...args: any[]) => Zotero.debug('Notero Error: ' + args.join(' ')),
  groupCollapsed: (...args: any[]) => Zotero.debug('Notero: ' + args.join(' ')),
  groupEnd: () => {},
  log: (...args: any[]) => Zotero.debug('Notero: ' + args.join(' ')),
  table: (data: any[], columns?: string[]) => {
    if (columns) {
      const tableData = data.map(item => {
        const row: Record<string, any> = {};
        columns.forEach(col => {
          row[col] = item[col];
        });
        return row;
      });
      Zotero.debug('Notero Table: ' + JSON.stringify(tableData, null, 2));
    } else {
      Zotero.debug('Notero Table: ' + JSON.stringify(data, null, 2));
    }
  }
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createXULElement(
  document: ZoteroDocument,
  tagName: string,
  attributes: Record<string, string> = {},
): Element {
  const element = document.createXULElement(tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

export function getXULElementById<T extends Element>(
  document: Document,
  id: string,
): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with ID "${id}" not found`);
  }
  return element as unknown as T;
}

export function buildCollectionFullName(collection: any): string {
  const names: string[] = [];
  let currentCollection: any = collection;

  while (currentCollection) {
    names.unshift(currentCollection.name);
    currentCollection = currentCollection.parent;
  }

  return names.join(' / ');
}

export function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

export function parseItemDate(date: string): Date | null {
  if (!date) return null;
  try {
    return new Date(date);
  } catch {
    return null;
  }
}

export function getAllCollectionItems(collection: any): any[] {
  const items: any[] = [];
  const collections = [collection];

  while (collections.length) {
    const currentCollection = collections.pop()!;
    items.push(...currentCollection.getChildItems());
    collections.push(...currentCollection.getChildCollections());
  }

  return items;
}

export async function getLocalizedErrorMessage(
  error: unknown,
  l10n: Document['l10n'],
): Promise<string> {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Yuque related functions
export interface ItemData {
  title: string;
  abstractNote: string;
  creators: Array<{
    firstName: string;
    lastName: string;
  }>;
  date: string;
  url: string;
}

export function getItemData(item: any): ItemData {
  return {
    title: item.getField('title') || '',
    abstractNote: item.getField('abstractNote') || '',
    creators: item.getCreators().map((creator: ZoteroCreator) => ({
      firstName: creator.firstName || '',
      lastName: creator.lastName || '',
    })),
    date: item.getField('date') || '',
    url: item.getField('url') || '',
  };
}

export async function getItemCitation(
  item: any,
  citationFormat: string,
): Promise<string> {
  try {
    // Wait for styles to be loaded
    await Zotero.Styles.init();
    
    const citation = await Zotero.QuickCopy.getContentFromItems(
      [item],
      citationFormat,
    );
    
    if (typeof citation === 'boolean') {
      return '';
    }
    
    return citation.text;
  } catch (error) {
    logger.error('Failed to get citation:', error);
    return '';
  }
} 