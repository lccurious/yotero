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
  it('creates new page with correct data', async () => {
    const { yuque, params, regularItem } = setup();

    await syncRegularItem(regularItem, params);

    expect(yuque.createDoc).toHaveBeenCalledWith('fake-namespace', {
      title: expect.any(String),
      slug: expect.any(String),
      body: 'fake-content',
      format: 'lake'
    });
  });

  it('throws error when API call fails', async () => {
    const { yuque, params, regularItem } = setup();
    const error = new Error('API error');
    yuque.createDoc.mockRejectedValue(error);

    await expect(() => syncRegularItem(regularItem, params)).rejects.toThrow(error);
  });
});
