import React from 'react';
import ReactDOM from 'react-dom';
import type { createRoot } from 'react-dom/client';

import { FluentMessageId } from '../../locale/fluent-types';
import { LocalizableError } from '../errors';
import { getNotionClient } from '../sync/notion-client';
import { normalizeID } from '../sync/notion-utils';
import {
  createXULElement,
  getLocalizedErrorMessage,
  getXULElementById,
  logger,
} from '../utils';

import {
  NoteroPref,
  PAGE_TITLE_FORMAT_L10N_IDS,
  PageTitleFormat,
  registerNoteroPrefObserver,
  unregisterNoteroPrefObserver,
} from './notero-pref';
import { SyncConfigsTable } from './sync-configs-table';

type ReactDOMClient = typeof ReactDOM & { createRoot: typeof createRoot };

type MenuItem = {
  disabled?: boolean;
  l10nId?: FluentMessageId;
  label?: string;
  value: string;
};

function setMenuItems(menuList: XUL.MenuListElement, items: MenuItem[]): void {
  menuList.menupopup.replaceChildren();

  items.forEach(({ disabled, l10nId, label, value }) => {
    const item = createXULElement(document, 'menuitem');
    item.value = value;
    item.disabled = Boolean(disabled);
    if (l10nId) {
      document.l10n.setAttributes(item, l10nId);
    } else {
      item.label = label || value;
    }
    menuList.menupopup.append(item);
  });
}

class Preferences {
  private pageTitleFormatMenu!: XUL.MenuListElement;
  private prefObserverSymbol!: symbol;
  private yuqueTokenInput!: HTMLInputElement;
  private yuqueTokenVisibilityToggle!: XUL.ButtonElement;

  public async init(): Promise<void> {
    await Zotero.uiReadyPromise;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this.pageTitleFormatMenu = getXULElementById('notero-pageTitleFormat')!;
    this.yuqueTokenInput = document.getElementById(
      'notero-yuqueToken',
    ) as HTMLInputElement;
    this.yuqueTokenVisibilityToggle = getXULElementById(
      'notero-yuqueToken-visibility',
    )!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    window.addEventListener('unload', () => {
      this.deinit();
    });

    // Initialize page title format menu first
    await this.initPageTitleFormatMenu();
    await this.initSyncConfigsTable();
  }

  private deinit(): void {
    unregisterNoteroPrefObserver(this.prefObserverSymbol);
  }

  private async initPageTitleFormatMenu(): Promise<void> {
    const isBetterBibTeXActive = await this.isBetterBibTeXActive();

    const menuItems = Object.values(PageTitleFormat).map<MenuItem>(
      (format) => ({
        disabled:
          format === PageTitleFormat.itemCitationKey && !isBetterBibTeXActive,
        l10nId: PAGE_TITLE_FORMAT_L10N_IDS[format],
        value: format,
      }),
    );

    setMenuItems(this.pageTitleFormatMenu, menuItems);
    this.pageTitleFormatMenu.disabled = false;
  }

  private async initSyncConfigsTable(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const syncConfigsTableContainer = document.getElementById(
      'notero-syncConfigsTable-container',
    )!;
    const collection = await document.l10n.formatValue(
      'notero-preferences-collection-column',
    );
    const syncEnabled = await document.l10n.formatValue(
      'notero-preferences-sync-enabled-column',
    );
    const columnLabels = {
      collectionFullName: collection || 'Collection',
      syncEnabled: syncEnabled || 'Sync Enabled',
    };

    (ReactDOM as ReactDOMClient)
      .createRoot(syncConfigsTableContainer)
      .render(
        <SyncConfigsTable
          columnLabels={columnLabels}
          container={syncConfigsTableContainer}
        />,
      );
  }

  private async isBetterBibTeXActive(): Promise<boolean> {
    const { AddonManager } = ChromeUtils.import(
      'resource://gre/modules/AddonManager.jsm',
    );
    const addon = await AddonManager.getAddonByID(
      'better-bibtex@iris-advies.com',
    );
    return Boolean(addon?.isActive);
  }

  public toggleYuqueTokenVisibility(): void {
    const isVisible = this.yuqueTokenInput.type !== 'password';
    this.yuqueTokenInput.type = isVisible ? 'password' : 'text';
    this.yuqueTokenVisibilityToggle.image = isVisible
      ? 'chrome://zotero/skin/16/universal/view.svg'
      : 'chrome://zotero/skin/16/universal/hide.svg';
    document.l10n.setArgs(this.yuqueTokenVisibilityToggle, {
      action: isVisible ? 'reveal' : 'conceal',
    });
  }
}

module.exports = {
  preferences: new Preferences(),
};
