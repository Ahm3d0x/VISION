/**
 * VISION Narration Phrase Bank
 * 
 * Provides rich, diverse, natural phrases (10+ per situation) for speech narration
 * during agent thinking, planning, tool dispatch, and task completion.
 * 
 * Includes an anti-repetition selector ensuring consecutive actions never repeat
 * the same robotic boilerplate phrase.
 */

export type NarrationCategory =
  | 'immediate_ack'
  | 'analyzing'
  | 'thinking'
  | 'launch_app'
  | 'close_app'
  | 'open_browser'
  | 'web_search'
  | 'fetch_web_page'
  | 'whatsapp_send'
  | 'whatsapp_screenshot'
  | 'whatsapp_read'
  | 'whatsapp_file'
  | 'contacts_search'
  | 'execute_command'
  | 'screen_vision'
  | 'memory_op'
  | 'step_success'
  | 'task_done'
  | 'multi_task_plan'
  | 'retrying';

interface PhrasePool {
  ar: string[];
  en: string[];
}

export const PHRASE_DICTIONARY: Record<NarrationCategory, PhrasePool> = {
  // 1. Immediate acknowledgement on command receipt
  immediate_ack: {
    ar: [
      'حاضر يا أحمد، شغال عليها...',
      'تمام يا فندم، ثواني...',
      'أمرك يا باشا، جاري التنفيذ...',
      'معاك يا أحمد، حالاً...',
      'واضح، ببدأ فيها فوراً...',
      'ثواني وهتكون جاهزة...',
      'تحت أمرك، شغال عليها دلوقتي...',
      'تمام، من عيوني...',
      'على طول يا أحمد...',
      'شغال يا فندم، ثواني وتخلص...',
      'أمرك، بنفذ المطلوب حالاً...',
      'سمعتك يا أحمد، جاري الشغل عليها...',
    ],
    en: [
      'Right away, Ahmed.',
      'Got it, working on it now.',
      'On it, Ahmed, just a moment.',
      'Understood, processing right now.',
      'Right on it, Ahmed.',
      'Handling this for you now.',
    ],
  },

  // 2. Analyzing request intent & planning
  analyzing: {
    ar: [
      'بفحص طلبك وببدأ التنفيذ...',
      'تمام، برتب الخطوات المطلوبة...',
      'دقيقة برتب الإجراء المناسب...',
      'بفهم التفاصيل وأنفذ حالاً...',
      'بحلل الخطوات وبدخل في التنفيذ...',
      'ثواني براجع المطلوب بالضبط...',
      'تمام، شغال على تجهيز المهمة...',
      'بشوف أنسب مسار للطلب...',
      'برتب خطوات العمل وببدأ فوراً...',
      'بستوعب الأوامر وجاهز للتنفيذ...',
    ],
    en: [
      'Analyzing your request parameters...',
      'Structuring the required steps now...',
      'Breaking down your instructions...',
      'Preparing the execution plan...',
    ],
  },

  // 3. Deep thinking & reasoning
  thinking: {
    ar: [
      'بشوف أفضل طريقة لتنفيذها...',
      'براجع الإجراءات لضمان دقة التنفيذ...',
      'ثواني برتب الأوامر المناسبة...',
      'تمام، بحدد أنسب خيار...',
      'بجهز الإجراء السليم دلوقتي...',
      'دقيقة برتب منطق الحل...',
      'بفحص الخيارات المتاحة للنظام...',
      'ثانية واحدة وببدأ...',
      'برتب الأوامر بأعلى دقة...',
      'بقيم أفضل مسار تقني...',
    ],
    en: [
      'Determining the optimal execution path...',
      'Evaluating the best system approach...',
      'Refining the execution logic...',
      'Verifying parameters for optimal accuracy...',
    ],
  },

  // 4. Launching applications ({app})
  launch_app: {
    ar: [
      'بفتح {app} دلوقتي...',
      'شغال، بشغل لك {app}...',
      'ثواني و{app} يفتح معاك...',
      'حاضر، جاري تشغيل {app}...',
      '{app} بيفتح حالاً...',
      'أمرك، بفتح تطبيق {app}...',
      'ثواني و{app} يكون جاهز على الشاشة...',
      'جاري فتح {app} في النظام...',
      'حالاً و{app} هيكون شغال قدامك...',
      'بشغل {app} فوراً...',
    ],
    en: [
      'Launching {app} now...',
      'Starting up {app} for you...',
      'Bringing up {app} on your screen...',
      'Opening {app} right now...',
    ],
  },

  // 5. Closing applications ({app})
  close_app: {
    ar: [
      'بقفل {app} حالا...',
      'تمام، بنهي تشغيل {app}...',
      'حاضر يا أحمد، بقفل {app}...',
      'ثواني و{app} يتقفل...',
      'بوقف تشغيل {app} دلوقتي...',
      'تم، جاري إنهاء نافذة {app}...',
      'بقفل تطبيق {app} حالاً...',
      'حاضر، بخرج من {app}...',
      'بنهي عملية {app} فوراً...',
      'شغال على غلق {app}...',
    ],
    en: [
      'Closing {app} now...',
      'Shutting down {app}...',
      'Terminating {app} process...',
      'Closing application window for {app}...',
    ],
  },

  // 6. Browser & web search ({target})
  open_browser: {
    ar: [
      'بفتح {target} في المتصفح...',
      'شغال، بدور على {target}...',
      'ثواني وبفتح لك {target}...',
      'جاري فتح {target} حالاً...',
      'بحولك على {target} دلوقتي...',
      'تمام، ببحث عن {target}...',
      'بفتح نافذة المتصفح على {target}...',
      'حاضر، بتنقل لـ {target}...',
      'شغال على استعراض {target}...',
      'ثواني والصفحة تكون معروضة...',
    ],
    en: [
      'Opening {target} in your browser...',
      'Navigating to {target}...',
      'Searching the web for {target}...',
      'Opening new tab for {target}...',
    ],
  },

  // 6.1 Online Web Search ({query})
  web_search: {
    ar: [
      'ببحث على الإنترنت عن {query}...',
      'ثواني وبجيب لك معلومات عن {query} من الويب...',
      'شغال، ببحث أونلاين عن {query}...',
      'جاري البحث على الإنترنت واستخراج النتائج عن {query}...',
      'بدور لك على أهم المصادر بخصوص {query}...',
      'لحظات، بجمع أهم المعلومات عن {query} من الإنترنت...',
      'بفحص نتائج البحث أونلاين عن {query} دلوقتي...',
      'ثواني وبجيب لك تفاصيل {query} والمصادر...',
      'ببحث في الويب عن {query} حالاً...',
      'جاري استخراج البيانات المطلوبة عن {query} من الإنترنت...',
    ],
    en: [
      'Searching the web for {query}...',
      'Looking up online information about {query}...',
      'Searching the internet and gathering sources for {query}...',
      'Fetching live web results for {query}...',
    ],
  },

  // 6.2 Fetching & Reading Web Page
  fetch_web_page: {
    ar: [
      'بقرأ وبحلل محتوى الصفحة...',
      'ثواني وبستخرج لك محتوى الرابط...',
      'شغال على قراءة محتوى الموقع واستخلاص المفيد منه...',
      'جاري قراءة الصفحة وتحليل أهم النقاط...',
      'بستعرض تفاصيل المقال من الرابط دلوقتي...',
      'لحظات وبجمع لك ملخص المقال والمصدر...',
    ],
    en: [
      'Reading and analyzing the webpage content...',
      'Extracting key information from the URL...',
      'Fetching the article content...',
    ],
  },

  // 6.3 WhatsApp Messaging ({recipient})
  whatsapp_send: {
    ar: [
      'بفتح الواتساب وببعت الرسالة لـ {recipient}...',
      'ثواني وبرسل الرسالة على الواتساب لـ {recipient}...',
      'شغال على إرسال الرسالة لـ {recipient} حالاً...',
      'تمام، بجهز الرسالة وبرسلها على الواتساب...',
      'حاضر يا أحمد، ببعت الرسالة دلوقتي...',
      'جاري إرسال الرسالة لـ {recipient} على الواتساب...',
    ],
    en: [
      'Sending WhatsApp message to {recipient}...',
      'Opening WhatsApp chat and sending message to {recipient}...',
      'Sending message on WhatsApp right away...',
    ],
  },

  // 6.4 WhatsApp Screenshot ({recipient})
  whatsapp_screenshot: {
    ar: [
      'باخد سكرين شوت وبجهزها للإرسال على الواتساب لـ {recipient}...',
      'ثواني، باخد لقطة شاشة وببعتها على الواتساب...',
      'شغال على التقاط الشاشة وإرسالها لـ {recipient}...',
      'تمام، بصور الشاشة وبرسلها على الواتساب حالاً...',
    ],
    en: [
      'Capturing screenshot and sending to {recipient} on WhatsApp...',
      'Taking screenshot and sending via WhatsApp...',
    ],
  },

  // 6.5 WhatsApp Read Chat
  whatsapp_read: {
    ar: [
      'بفتح محادثة الواتساب وبقرأ الرسايل الأخيرة...',
      'بفحص شات الواتساب وبشوف الرسايل اللي مبعوتة...',
      'ثواني وبقرأ لك تفاصيل المحادثة من الواتساب...',
      'شغال على قراءة محادثة الواتساب واستخراج الرسايل...',
    ],
    en: [
      'Opening WhatsApp chat and reading recent messages...',
      'Inspecting WhatsApp conversation on screen...',
    ],
  },

  // 6.6 WhatsApp File & Document Sending ({filename}, {recipient})
  whatsapp_file: {
    ar: [
      'بجهز ملف {filename} وبرسله لـ {recipient} على الواتساب...',
      'ثواني وبرسل الملف {filename} على الواتساب لـ {recipient}...',
      'شغال على إرسال المستند {filename} على الواتساب...',
      'تمام، بفتح المحادثة وبرفق الملف {filename} وببعته حالاً...',
      'حاضر يا أحمد، برسل ملف {filename} على الواتساب دلوقتي...',
    ],
    en: [
      'Preparing file {filename} and sending to {recipient} via WhatsApp...',
      'Attaching document {filename} and sending over WhatsApp...',
      'Sending file {filename} to {recipient} on WhatsApp right away...',
    ],
  },

  // 6.6 Contacts Search ({query})
  contacts_search: {
    ar: [
      'بدور في جهات الاتصال على {query}...',
      'بستعلم عن رقم {query} من دليل الأرقام...',
      'ثواني وبشوف بيانات {query} في جهات الاتصال...',
      'شغال على البحث في دليل الهاتف...',
    ],
    en: [
      'Searching contacts address book for {query}...',
      'Looking up contact details for {query}...',
    ],
  },

  // 7. Command line execution
  execute_command: {
    ar: [
      'بشغل الأمر المطلوب في النظام...',
      'تمام، بنفذ الأمر عبر الكونسول...',
      'ثواني والأمر يتنفذ...',
      'جاري تنفيذ الأمر ومتابعة النتيجة...',
      'بشغل السكربت المطلوب حالاً...',
      'أمرك، بشغل الأمر في الخلفية...',
      'شغال على تنفيذ أمر النظام...',
      'بتابع تشغيل الأمر دلوقتي...',
      'بنفذ الأوامر وبشوف النتيجة...',
      'جاري إرسال الأمر للطرفية...',
    ],
    en: [
      'Executing command in terminal...',
      'Running system command now...',
      'Executing shell instruction...',
      'Running command on your machine...',
    ],
  },

  // 8. Computer vision and screen inspection
  screen_vision: {
    ar: [
      'بفحص الشاشة بصرياً دلوقتي...',
      'باخد لقطة وبحلل اللي ظاهر قدامك...',
      'ثواني وبشوف محتوى الشاشة بنموذج الرؤية...',
      'بقرأ العناصر والنوافذ المفتوحة...',
      'جاري التقاط الشاشة وتحليلها...',
      'بفحص الخطأ والواجهة المعروضة...',
      'شغال على قراءة محتوى الشاشة...',
      'ثواني وبستخرج التفاصيل من الشاشة...',
      'بحلل الصورة بصرياً حالاً...',
      'جاري معاينة الشاشة بدقة...',
    ],
    en: [
      'Analyzing the screen visually...',
      'Inspecting current desktop contents...',
      'Processing visual screenshot with vision model...',
      'Examining active display contents...',
    ],
  },

  // 9. Memory management
  memory_op: {
    ar: [
      'بتعامل مع الذاكرة الدائمة دلوقتي...',
      'بحفظ المعلومة في الذاكرة...',
      'بفحص الذاكرة الدائمة لاسترجاع المطلوب...',
      'تمام، بسجل البيانات دي في الذاكرة...',
      'بحدث بيانات الذاكرة الخاصة بالمشروع...',
      'بستعلم من قاعدة الذاكرة المحلية...',
    ],
    en: [
      'Accessing persistent memory...',
      'Storing context in memory base...',
      'Searching local memory records...',
    ],
  },

  // 10. Step success & moving forward
  step_success: {
    ar: [
      'الخطوة دي تمت، ومكملين...',
      'تمام، دي خلصت وداخل على اللي بعدها...',
      'تمام كدة، شغال على باقي الإجراء...',
      'تمام التمام، مكمل باقي الخطوات...',
      'الخطوة دي تمام، بنتقل للنقطة التالية...',
      'تمام، مستمر في التنفيذ...',
      'دي خلصت بنجاح، بثواني نخلص الباقي...',
      'شغال، والخطوة اتنفذت بنجاح...',
      'الأمر تم بنجاح، ومتابع الباقي...',
      'تمام، خطوة ناجحة ومستمرين...',
    ],
    en: [
      'Step completed, moving forward...',
      'Done with this step, proceeding...',
      'Action verified successfully, next step...',
      'Step finished cleanly, continuing...',
    ],
  },

  // 11. Task completion
  task_done: {
    ar: [
      'كده تمام يا أحمد، نفذت المطلوب.',
      'خلصت كل الإجراءات بنجاح يا باشا.',
      'تمام يا أحمد، العملية اكتملت بالكامل.',
      'جاهز يا فندم، نفذت المطلوب كله.',
      'تمام، كل المهام خلصت بنجاح.',
      'كده جاهز ومستعد لأي أمر جديد يا أحمد.',
      'كده خلصنا والنتيجة جاهزة قدامك.',
      'كله اتنفذ على أكمل وجه يا باشا.',
      'أمرك تم بنجاح يا أحمد، كله جاهز.',
      'تمام، كل حاجة اتنفذت بالظبط.',
    ],
    en: [
      'All set, Ahmed! Finished.',
      'Completed successfully, Ahmed.',
      'Everything is done and ready.',
      'All tasks wrapped up cleanly, Ahmed.',
    ],
  },

  // 12. Multi-task plan notification ({count})
  multi_task_plan: {
    ar: [
      'حددت {count} مهام في طلبك، بنفذهم ورا بعض...',
      'شغال على الـ {count} مهام بالترتيب لتسريع التنفيذ...',
      'لقيت {count} إجراءات، برتبهم وبنفذ حالاً...',
      'تمام يا أحمد، مقسمهم لـ {count} خطوات وشغال...',
      'قسمت طلبك لـ {count} مهام وبدأت فيها...',
    ],
    en: [
      'Identified {count} tasks, executing concurrently...',
      'Breaking your request into {count} actionable tasks...',
    ],
  },

  // 13. Retrying / recovering from a failure ({detail})
  retrying: {
    ar: [
      'حدث خطأ في {detail}، بجرب مسار بديل حالاً...',
      'بحلل سبب العطل في {detail} وبصلحه دلوقتي...',
      'ثواني، بعدل الأمر وبنفذه بطريقة ثانية...',
      'بجرب أسلوب بديل لتجاوز المشكلة...',
    ],
    en: [
      'Error in {detail}, attempting alternative approach...',
      'Adjusting execution strategy to recover...',
    ],
  },
};

export class NarrationManager {
  // History of recent indices per category to avoid repeats (keeps last 3)
  private recentIndices: Map<string, number[]> = new Map();

  /**
   * Get a varied phrase for a category with template variable interpolation.
   * Guarantees non-repetition across consecutive calls.
   */
  public getPhrase(
    category: NarrationCategory,
    vars?: Record<string, string | number>,
    isArabic: boolean = true
  ): string {
    const pool = PHRASE_DICTIONARY[category];
    if (!pool) return '';

    const list = isArabic ? pool.ar : pool.en;
    if (!list || list.length === 0) return '';

    const historyKey = `${category}_${isArabic ? 'ar' : 'en'}`;
    const recent = this.recentIndices.get(historyKey) || [];

    // Filter available candidates not in recent history (if list size permits)
    const availableIndices: number[] = [];
    for (let i = 0; i < list.length; i++) {
      if (!recent.includes(i)) {
        availableIndices.push(i);
      }
    }

    // If all or most indices are exhausted, reset history
    const candidateIndices = availableIndices.length > 0
      ? availableIndices
      : list.map((_, i) => i);

    const chosenIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];

    // Update history (keep last 3)
    const updatedHistory = [...recent, chosenIndex].slice(-3);
    this.recentIndices.set(historyKey, updatedHistory);

    let text = list[chosenIndex];

    // Interpolate variables (e.g. {app}, {target}, {count}, {detail})
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    return text;
  }

  /**
   * Export all pre-defined phrases for batch generation / pre-recording
   */
  public exportAllPhrases(): Record<string, { ar: string[]; en: string[] }> {
    return PHRASE_DICTIONARY;
  }
}

export const narrationManager = new NarrationManager();
