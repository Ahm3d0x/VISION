import { llmProviderManager } from '../providers/llm';
import { DEFAULT_GEMINI_KEY } from '../providers/llm/gemini';

export interface ImageAnalysisResult {
  success: boolean;
  analysis: string;
  modelUsed: string;
  durationMs?: number;
  error?: string;
}

export interface ScreenAnalysisResult extends ImageAnalysisResult {
  filePath?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  screenName?: string;
  screenIndex?: number;
}

export interface ImageFileAnalysisResult extends ImageAnalysisResult {
  filePath: string;
  dataUrl?: string;
}

function getVisionAPI(): any {
  if (typeof window !== 'undefined' && (window as any).visionAPI) {
    return (window as any).visionAPI;
  }
  return undefined;
}

export class VisionService {
  private ollamaBaseUrl: string = 'http://localhost:11434';
  private localVisionModel: string = 'qwen3-vl:4b';
  private geminiVisionModels: string[] = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];

  constructor(options?: { ollamaBaseUrl?: string; localVisionModel?: string }) {
    if (options?.ollamaBaseUrl) {
      this.ollamaBaseUrl = options.ollamaBaseUrl.replace(/\/+$/, '');
    }
    if (options?.localVisionModel) {
      this.localVisionModel = options.localVisionModel;
    }
  }

  /**
   * Cleans a base64 string by stripping any "data:image/...;base64," prefix.
   */
  private cleanBase64(input: string): string {
    const commaIndex = input.indexOf(',');
    if (input.startsWith('data:') && commaIndex !== -1) {
      return input.substring(commaIndex + 1).trim();
    }
    return input.trim();
  }

  /**
   * Check if local Ollama vision model (qwen3-vl:4b) is accessible and installed.
   */
  public async isOllamaVisionAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.ollamaBaseUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) return false;
      const data = await res.json();
      const models = data?.models || [];
      return models.some((m: any) =>
        m.name === this.localVisionModel ||
        m.name.startsWith(this.localVisionModel.split(':')[0]) ||
        m.name.includes('vl')
      );
    } catch {
      return false;
    }
  }

  /**
   * Analyze an image from base64 or DataURL using local Qwen3-VL (RTX 3060) or Gemini Multimodal.
   */
  public async analyzeImage(
    base64OrDataUrl: string,
    prompt?: string,
    options?: { mimeType?: string; preferredModel?: string }
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    const cleanBase64 = this.cleanBase64(base64OrDataUrl);
    const mimeType = options?.mimeType || 'image/png';

    const defaultPrompt = 
      'قم بفحص وتحليل هذه الصورة بدقة شديدة: استخرج النصوص المكتوبة، النوافذ النشطة، الأكواد البرمجية، الأخطاء أو التنبيهات، وقدم تقريرًا تحليليًا واضحًا ومفصلًا باللغة العربية مع ملخص بالإنجليزية.\n' +
      'Please analyze this image thoroughly: identify open windows, active UI elements, visible text/code, error messages, and provide a clear, helpful breakdown in Arabic with an English summary.';

    const finalPrompt = (prompt && prompt.trim().length > 0) ? prompt.trim() : defaultPrompt;

    const activeProvider = llmProviderManager.getActiveProviderName();
    const ollamaReady = await this.isOllamaVisionAvailable();

    // 1. Priority: Local Qwen3-VL on RTX 3060 via Ollama (100% Offline & Private)
    if (activeProvider === 'ollama' || ollamaReady) {
      try {
        console.log(`[VisionService] Invoking Local Vision Model (${this.localVisionModel}) on Ollama...`);
        const res = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: options?.preferredModel || this.localVisionModel,
            prompt: finalPrompt,
            images: [cleanBase64],
            stream: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const analysisText = (data.response || data.message?.content || '').trim();
          if (analysisText) {
            return {
              success: true,
              analysis: analysisText,
              modelUsed: `Local Ollama (${this.localVisionModel} on RTX 3060)`,
              durationMs: Date.now() - startTime,
            };
          }
        } else {
          console.warn(`[VisionService] Ollama Vision failed HTTP ${res.status}, attempting fallback...`);
        }
      } catch (err: any) {
        console.warn('[VisionService] Ollama Vision exception:', err.message);
      }
    }

    // 2. Cloud Fallback: Gemini Multimodal Vision API
    for (const geminiModel of this.geminiVisionModels) {
      try {
        console.log(`[VisionService] Invoking Gemini Multimodal Vision (${geminiModel})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${DEFAULT_GEMINI_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': DEFAULT_GEMINI_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: finalPrompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim().length > 0) {
            return {
              success: true,
              analysis: candidateText.trim(),
              modelUsed: `Gemini Multimodal (${geminiModel})`,
              durationMs: Date.now() - startTime,
            };
          }
        }
      } catch (geminiErr: any) {
        console.warn(`[VisionService] Gemini ${geminiModel} error:`, geminiErr.message);
      }
    }

    return {
      success: false,
      analysis: 'تعذر تحليل الصورة: لم يتمكن أي نموذج رؤية (سواء محلي عبر Ollama أو سحابي) من معالجة الصورة.',
      modelUsed: 'none',
      durationMs: Date.now() - startTime,
      error: 'Vision models unavailable or unable to process image.',
    };
  }

  /**
   * Capture screenshot of the desktop screen (Display 1 or Display 2) and analyze it.
   */
  public async analyzeScreen(options?: {
    screenIndex?: number;
    prompt?: string;
  }): Promise<ScreenAnalysisResult> {
    const api = getVisionAPI();
    if (!api?.takeScreenshot) {
      return {
        success: false,
        analysis: 'خاصية التقاط الشاشة غير متاحة في بيئة العمل الحالية.',
        modelUsed: 'none',
        error: 'visionAPI.takeScreenshot not available in current environment',
      };
    }

    // Step 1: Capture screenshot
    const shot = await api.takeScreenshot({ screenIndex: options?.screenIndex });
    if (!shot.success || !shot.dataUrl) {
      return {
        success: false,
        analysis: `فشل التقاط لقطة الشاشة: ${shot.error || 'خطأ غير معروف'}`,
        modelUsed: 'none',
        error: shot.error,
      };
    }

    // Step 2: Analyze screenshot image with Vision Model
    const screenPrompt = options?.prompt || 
      'افحص شاشة المستخدم الحالية بدقة:\n' +
      '1. ما هي التطبيقات أو النوافذ المفتوحة؟\n' +
      '2. هل توجد أي رسائل خطأ، تنبيهات، أو كود مفتوح؟\n' +
      '3. لخص المحتوى بوضوح باللغة العربية واقترح الخطوة المناسبة.\n' +
      'Inspect the current desktop screen: identify open applications, visible code or terminal output, any error messages, and summarize clearly in Arabic and English.';

    const analysisRes = await this.analyzeImage(shot.dataUrl, screenPrompt);

    return {
      success: analysisRes.success,
      analysis: analysisRes.analysis,
      filePath: shot.filePath,
      dataUrl: shot.dataUrl,
      width: shot.width,
      height: shot.height,
      screenName: shot.screenName,
      screenIndex: shot.screenIndex,
      modelUsed: analysisRes.modelUsed,
      durationMs: analysisRes.durationMs,
      error: analysisRes.error,
    };
  }

  /**
   * Inspect and analyze a local image file.
   */
  public async analyzeImageFile(
    filePath: string,
    prompt?: string
  ): Promise<ImageFileAnalysisResult> {
    const api = getVisionAPI();
    if (!api?.readImageBase64) {
      return {
        success: false,
        filePath,
        analysis: 'أداة قراءة ملفات الصور غير متاحة.',
        modelUsed: 'none',
        error: 'visionAPI.readImageBase64 not available in current environment',
      };
    }

    const fileRes = await api.readImageBase64(filePath);
    if (!fileRes.success || !fileRes.base64) {
      return {
        success: false,
        filePath,
        analysis: `تعذر قراءة ملف الصورة من المسار: ${filePath} (${fileRes.error || 'الملف غير موجود'})`,
        modelUsed: 'none',
        error: fileRes.error,
      };
    }

    const filePrompt = prompt || `قم بتحليل هذه الصورة واستخراج ما تحتويه من نصوص أو تفاصيل: ${filePath}`;
    const analysisRes = await this.analyzeImage(fileRes.base64, filePrompt, { mimeType: fileRes.mimeType });

    return {
      success: analysisRes.success,
      filePath,
      dataUrl: fileRes.dataUrl,
      analysis: analysisRes.analysis,
      modelUsed: analysisRes.modelUsed,
      durationMs: analysisRes.durationMs,
      error: analysisRes.error,
    };
  }
}

export const visionService = new VisionService();
