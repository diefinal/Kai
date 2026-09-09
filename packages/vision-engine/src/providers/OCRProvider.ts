import { IOCRProvider } from '../interfaces';

/** Stub OCR provider – returns empty array for extracted text */
export class StubOCRProvider implements IOCRProvider {
  async extractText(_image: any): Promise<any[]> {
    // No real OCR – return empty array.
    return [];
  }
}
