declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface MammothOptions {
    path?: string;
    buffer?: Buffer;
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
  }

  export function convertToHtml(input: { path: string } | { buffer: Buffer }, options?: MammothOptions): Promise<MammothResult>;
  export function convertToMarkdown(input: { path: string } | { buffer: Buffer }, options?: MammothOptions): Promise<MammothResult>;
  export function extractRawText(input: { path: string } | { buffer: Buffer }): Promise<MammothResult>;
}

declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: any;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: any) => string | Promise<string>;
    max?: number;
    version?: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export = PDFParse;
}
