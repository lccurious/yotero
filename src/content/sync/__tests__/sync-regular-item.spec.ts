import { APIErrorCode, APIResponseError, type Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { createZoteroItemMock } from '../../../../test/utils';
import { getNotionPageID } from '../../data/item-data';
import { PageTitleFormat } from '../../prefs/notero-pref';
import type { DatabaseRequestProperties } from '../notion-types';
import { buildProperties } from '../property-builder';
import type { SyncJobParams } from '../sync-job';
import { syncRegularItem } from '../sync-regular-item';
import { YuqueClient } from '../yuque-client';

vi.mock('../../data/item-data');
vi.mock('../property-builder');

const objectNotFoundError = new APIResponseError({
  code: APIErrorCode.ObjectNotFound,
  status: 404,
  message: 'Not found',
  headers: {},
  rawBodyText: 'Not found',
});

const validationError = new APIResponseError({
  code: APIErrorCode.ValidationError,
  status: 400,
  message: 'Validation error',
  headers: {},
  rawBodyText: 'Validation error',
});

const fakeCitationFormat = 'fake-style';
const fakeDatabaseID = 'fake-database-id';
const fakeDatabaseProperties = {};
const fakePageID = 'fake-page-id';
const fakePageProperties: DatabaseRequestProperties = { title: { title: [] } };
const fakePageTitleFormat = PageTitleFormat.itemAuthorDateCitation;
const fakePageResponse: PageObjectResponse = {
  archived: false,
  cover: null,
  created_by: { id: '', object: 'user' },
  created_time: '',
  icon: null,
  id: fakePageID,
  in_trash: false,
  last_edited_by: { id: '', object: 'user' },
  last_edited_time: '',
  object: 'page',
  parent: { database_id: fakeDatabaseID, type: 'database_id' },
  properties: {},
  public_url: null,
  url: 'fake-url',
};

// Mock Zotero global object
const mockZotero = {
  QuickCopy: {
    getContentFromItems: vi.fn().mockResolvedValue({ text: 'Mock Citation' }),
  },
};
(global as any).Zotero = mockZotero;

function setup() {
  const regularItem = createZoteroItemMock();
  const yuque = mockDeep<YuqueClient>({
    fallbackMockImplementation: () => {
      throw new Error('NOT MOCKED');
    },
  });

  yuque.createDoc.mockResolvedValue({ data: { id: 'fake-doc-id', title: 'fake-title', slug: 'fake-slug', body: 'fake-body', format: 'lake' } });
  yuque.createLakeContent.mockReturnValue('fake-content');
  Object.defineProperty(yuque, 'namespace', {
    get: () => 'fake-namespace'
  });

  const params: SyncJobParams = {
    citationFormat: 'fake-style',
    pageTitleFormat: PageTitleFormat.itemAuthorDateCitation,
    yuque,
  };

  return { yuque, params, regularItem };
}

describe('syncRegularItem', () => {
  it('should sync a regular item with author-date citation title format', async () => {
    // Create mock item
    const regularItem = createZoteroItemMock({
      getField: (field: string) => {
        switch (field) {
          case 'title':
            return 'Test Title';
          case 'abstractNote':
            return 'Test Abstract';
          case 'date':
            return '2024-03-20';
          case 'url':
            return 'https://example.com';
          default:
            return '';
        }
      },
      getCreators: () => [{
        firstName: 'John',
        lastName: 'Doe',
        fieldMode: 0,
        creatorTypeID: 1
      }]
    });

    // Create mock YuqueClient
    const yuque = mockDeep<YuqueClient>();
    yuque.createLakeContent.mockReturnValue('fake lake content');
    yuque.createDoc.mockResolvedValue({
      data: {
        id: 'fake-doc-id',
        title: 'Doe, 2024',
        slug: 'doe-2024',
        body: 'fake lake content',
        format: 'lake'
      }
    });
    Object.defineProperty(yuque, 'namespace', {
      get: () => 'fake-namespace'
    });

    // Create sync params
    const params: SyncJobParams = {
      yuque,
      citationFormat: 'fake-citation-format',
      pageTitleFormat: PageTitleFormat.itemAuthorDateCitation
    };

    // Perform sync
    await syncRegularItem(regularItem, params);

    // Verify YuqueClient calls
    expect(yuque.createLakeContent).toHaveBeenCalledWith(
      'Test Title',
      'Test Abstract',
      'John Doe',
      '2024-03-20',
      'https://example.com',
      'Mock Citation'
    );

    expect(yuque.createDoc).toHaveBeenCalledWith(
      'fake-namespace',
      {
        title: 'Doe, 2024',
        slug: 'doe-2024',
        body: 'fake lake content',
        format: 'lake'
      }
    );
  });

  it('throws error when API call fails', async () => {
    const { yuque, params, regularItem } = setup();
    const error = new Error('API error');
    yuque.createDoc.mockRejectedValue(error);

    await expect(() => syncRegularItem(regularItem, params)).rejects.toThrow(error);
  });
});
