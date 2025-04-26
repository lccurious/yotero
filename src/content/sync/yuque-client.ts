import { getRequiredNoteroPref, NoteroPref } from '../prefs/notero-pref';
import { logger } from '../utils';

interface YuqueDoc {
  id: string;
  title: string;
  slug: string;
  body: string;
  format: string;
}

interface YuqueResponse<T> {
  data: T;
}

export class YuqueClient {
  private baseUrl: string;
  private token: string;
  private groupLogin: string;
  private bookSlug: string;

  constructor() {
    this.baseUrl = getRequiredNoteroPref(NoteroPref.yuqueBaseUrl);
    this.token = getRequiredNoteroPref(NoteroPref.yuqueToken);
    this.groupLogin = getRequiredNoteroPref(NoteroPref.yuqueGroupLogin);
    this.bookSlug = getRequiredNoteroPref(NoteroPref.yuqueBookSlug);

    if (!this.baseUrl.endsWith('/api/v2')) {
      this.baseUrl = `${this.baseUrl}/api/v2`;
    }
  }

  get namespace(): string {
    return `${this.groupLogin}/${this.bookSlug}`;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: Record<string, unknown>
  ): Promise<YuqueResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    logger.debug('Making request to:', url);
    const headers = {
      'X-Auth-Token': this.token,
      'Content-Type': 'application/json',
      'User-Agent': 'Notero/1.0'
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      const responseText = await response.text();
      logger.debug('Response status:', response.status);
      logger.debug('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = JSON.parse(responseText) as { message?: string };
          if (errorData.message) {
            errorMessage += `: ${errorData.message}`;
          }
        } catch {
          errorMessage += `: ${responseText}`;
        }
        logger.error('Yuque API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const responseData = JSON.parse(responseText) as YuqueResponse<T>;
      return responseData;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed: Unknown error');
    }
  }

  async createDoc(namespace: string, data: {
    title: string;
    slug: string;
    body: string;
    format: string;
  }): Promise<YuqueResponse<YuqueDoc>> {
    return this.request<YuqueDoc>('POST', `/repos/${namespace}/docs`, data);
  }

  async updateDoc(namespace: string, id: string, data: {
    title: string;
    slug: string;
    body: string;
    format: string;
  }): Promise<YuqueResponse<YuqueDoc>> {
    return this.request<YuqueDoc>('PUT', `/repos/${namespace}/docs/${id}`, data);
  }

  async getDoc(namespace: string, id: string): Promise<YuqueResponse<YuqueDoc>> {
    return this.request<YuqueDoc>('GET', `/repos/${namespace}/docs/${id}`);
  }

  async searchDoc(namespace: string, query: string): Promise<YuqueResponse<YuqueDoc[]>> {
    return this.request<YuqueDoc[]>('GET', `/repos/${namespace}/docs/search?q=${encodeURIComponent(query)}`);
  }

  createLakeContent(title: string, abstract: string, authors: string, year: string, url: string, citation: string): string {
    return `<!doctype lake><title>${title}</title><meta name="doc-version" content="1" /><meta name="viewport" content="fixed" /><h1 data-lake-id="zlR1B" id="zlR1B"><span data-lake-id="u57fd11df" id="u57fd11df">${title}</span></h1><blockquote data-lake-id="u5b47fecf" id="u5b47fecf"><p data-lake-id="u5cf7ce46" id="u5cf7ce46"><span data-lake-id="u46b72c10" id="u46b72c10">${abstract}</span></p></blockquote><p data-lake-id="ucb87cfdf" id="ucb87cfdf"><strong><span data-lake-id="ue375119a" id="ue375119a" style="color: #000000">Authors: </span></strong><span data-lake-id="u2e758728" id="u2e758728">${authors}</span></p><p data-lake-id="ua0cbb4cb" id="ua0cbb4cb"><strong><span data-lake-id="u362b2558" id="u362b2558">Year: </span></strong><span data-lake-id="u54048871" id="u54048871">${year}</span></p><p data-lake-id="u81dee455" id="u81dee455"><strong><span data-lake-id="ub99e1414" id="ub99e1414">URL:</span></strong><span data-lake-id="uae1aad34" id="uae1aad34"> </span><a href="${url}" target="_blank" data-lake-id="uf1813f67" id="uf1813f67"><span data-lake-id="u5d9c8596" id="u5d9c8596">${url}</span></a></p><p data-lake-id="u681ce75e" id="u681ce75e"><strong><span data-lake-id="u4c1f72f0" id="u4c1f72f0">Full Citation:</span></strong><span data-lake-id="u8fcf0a14" id="u8fcf0a14"> ${citation}</span></p><card type="block" name="hr" value="data:%7B%22id%22%3A%22GzNsW%22%7D"></card>`;
  }
} 