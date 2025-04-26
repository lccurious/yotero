import { getRequiredNoteroPref, NoteroPref } from '../prefs/notero-pref';
import { logger } from '../utils';

interface YuqueDoc {
  id: string;
  title: string;
  slug: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface YuqueResponse<T> {
  data: T;
}

export class YuqueClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly groupLogin: string;
  private readonly bookSlug: string;

  constructor() {
    const baseUrl = getRequiredNoteroPref(NoteroPref.yuqueBaseUrl) as string;
    // Ensure baseUrl ends with /api/v2
    this.baseUrl = baseUrl.endsWith('/api/v2') ? baseUrl : `${baseUrl}/api/v2`;
    this.token = getRequiredNoteroPref(NoteroPref.yuqueToken) as string;
    this.groupLogin = getRequiredNoteroPref(NoteroPref.yuqueGroupLogin) as string;
    this.bookSlug = getRequiredNoteroPref(NoteroPref.yuqueBookSlug) as string;
    
    logger.debug('YuqueClient initialized with:', {
      baseUrl: this.baseUrl,
      groupLogin: this.groupLogin,
      bookSlug: this.bookSlug
    });
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug('Making request to:', url);
    const headers = {
      'Content-Type': 'application/json',
      'X-Auth-Token': this.token,
      'User-Agent': 'Notero/1.0'
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
      logger.debug('Request body:', options.body);
    }

    try {
      const response = await fetch(url, options);
      const responseText = await response.text();
      logger.debug('Response status:', response.status);
      logger.debug('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText) as { message?: string };
          errorMessage += `, message: ${errorData.message || responseText}`;
        } catch {
          errorMessage += `, message: ${responseText}`;
        }
        logger.error('Yuque API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      logger.debug('Response data:', JSON.stringify(data));
      return data as T;
    } catch (error) {
      logger.error('Yuque API request failed:', error);
      throw error;
    }
  }

  async createDoc(title: string, content: string, slug?: string): Promise<YuqueResponse<YuqueDoc>> {
    if (!slug) {
      // Generate 8-character hash from content
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
        .then(hash => {
          const hashArray = Array.from(new Uint8Array(hash));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
        });
      slug = hash;
    }

    const endpoint = `/repos/${this.groupLogin}/${this.bookSlug}/docs`;
    const body = {
      title,
      slug,
      body: content,
      format: 'lake',
    };

    logger.debug('Creating doc with:', { title, slug, endpoint });
    return this.request<YuqueResponse<YuqueDoc>>('POST', endpoint, body);
  }

  createLakeContent(title: string, abstract: string, authors: string, year: string, url: string, citation: string): string {
    return `<!doctype lake><title>${title}</title><meta name="doc-version" content="1" /><meta name="viewport" content="fixed" /><h1 data-lake-id="zlR1B" id="zlR1B"><span data-lake-id="u57fd11df" id="u57fd11df">${title}</span></h1><blockquote data-lake-id="u5b47fecf" id="u5b47fecf"><p data-lake-id="u5cf7ce46" id="u5cf7ce46"><span data-lake-id="u46b72c10" id="u46b72c10">${abstract}</span></p></blockquote><p data-lake-id="ucb87cfdf" id="ucb87cfdf"><strong><span data-lake-id="ue375119a" id="ue375119a" style="color: #000000">Authors: </span></strong><span data-lake-id="u2e758728" id="u2e758728">${authors}</span></p><p data-lake-id="ua0cbb4cb" id="ua0cbb4cb"><strong><span data-lake-id="u362b2558" id="u362b2558">Year: </span></strong><span data-lake-id="u54048871" id="u54048871">${year}</span></p><p data-lake-id="u81dee455" id="u81dee455"><strong><span data-lake-id="ub99e1414" id="ub99e1414">URL:</span></strong><span data-lake-id="uae1aad34" id="uae1aad34"> </span><a href="${url}" target="_blank" data-lake-id="uf1813f67" id="uf1813f67"><span data-lake-id="u5d9c8596" id="u5d9c8596">${url}</span></a></p><p data-lake-id="u681ce75e" id="u681ce75e"><strong><span data-lake-id="u4c1f72f0" id="u4c1f72f0">Full Citation:</span></strong><span data-lake-id="u8fcf0a14" id="u8fcf0a14"> ${citation}</span></p><card type="block" name="hr" value="data:%7B%22id%22%3A%22GzNsW%22%7D"></card>`;
  }

  async updateDoc(docId: string, title: string, content: string): Promise<YuqueResponse<YuqueDoc>> {
    const endpoint = `/repos/${this.groupLogin}/${this.bookSlug}/docs/${docId}`;
    const body = {
      title,
      body: content,
      format: 'lake',
    };

    logger.debug('Updating doc with:', { docId, title, endpoint });
    return this.request<YuqueResponse<YuqueDoc>>('PUT', endpoint, body);
  }

  async getDoc(docId: string): Promise<YuqueResponse<YuqueDoc>> {
    const endpoint = `/repos/${this.groupLogin}/${this.bookSlug}/docs/${docId}`;
    logger.debug('Getting doc with:', { docId, endpoint });
    return this.request<YuqueResponse<YuqueDoc>>('GET', endpoint);
  }

  async searchDoc(title: string): Promise<YuqueResponse<YuqueDoc[]>> {
    const endpoint = `/search?q=${encodeURIComponent(title)}&type=doc`;
    logger.debug('Searching docs with:', { title, endpoint });
    return this.request<YuqueResponse<YuqueDoc[]>>('GET', endpoint);
  }
} 