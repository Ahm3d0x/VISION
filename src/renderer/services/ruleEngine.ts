// Comprehensive Predefined Fast Rule & Action Engine for VISION OS (JARVIS)
// Integrated with legacy vision capabilities + modern system actions & flexible bilingual triggers

export interface MatchResult {
  matched: boolean;
  intent: string;
  target: string;
  responseSpeech: string;
  responseArabic: string;
  actionType: 'app' | 'app_close' | 'app_list' | 'web' | 'system' | 'chat' | 'media' | 'screenshot' | 'weather';
  webUrl?: string;
  appCommand?: string;
  appArgs?: string[];
  screenIndex?: number;
  targetCity?: string;
}

export function matchPredefinedCommand(rawText: string): MatchResult {
  const text = rawText.trim().toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(rawText);

  // Helper for word matching
  const hasWord = (...words: string[]) => {
    return words.some(w => {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9\u0600-\u06FF])${w}($|\\s|[^a-zA-Z0-9\u0600-\u06FF])`, 'i');
      return regex.test(text) || text === w;
    });
  };

  // 1. Google Search Query Extract
  if (text.includes('search on google') || text.includes('ابحث في جوجل') || text.includes('ابحث على جوجل') || text.startsWith('google ')) {
    const query = text.replace(/search on google|ابحث في جوجل|ابحث على جوجل|^google\s+/gi, '').trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(query || 'VISION OS')}`;
    window.open(url, '_blank');
    return {
      matched: true,
      intent: `Search Google for "${query}"`,
      target: 'Google Search Engine',
      responseSpeech: `Searching Google for ${query}...`,
      responseArabic: `جاري البحث في جوجل عن ${query}...`,
      actionType: 'web',
      webUrl: url,
    };
  }

  // 2. YouTube Search Query Extract
  if (text.includes('search on youtube') || text.includes('ابحث في يوتيوب') || text.includes('ابحث على يوتيوب') || text.startsWith('youtube ')) {
    const query = text.replace(/search on youtube|ابحث في يوتيوب|ابحث على يوتيوب|^youtube\s+/gi, '').trim();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query || 'Music')}`;
    window.open(url, '_blank');
    return {
      matched: true,
      intent: `Search YouTube for "${query}"`,
      target: 'YouTube Media Platform',
      responseSpeech: `Searching YouTube for ${query}...`,
      responseArabic: `جاري البحث في يوتيوب عن ${query}...`,
      actionType: 'web',
      webUrl: url,
    };
  }

  // 3. Wikipedia Search Extract
  if (text.includes('wikipedia') || text.includes('ويكيبيديا') || text.includes('ابحث في ويكيبيديا')) {
    const query = text.replace(/wikipedia|ويكيبيديا|ابحث في ويكيبيديا/gi, '').trim();
    const url = isArabic
      ? `https://ar.wikipedia.org/wiki/${encodeURIComponent(query)}`
      : `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;
    window.open(url, '_blank');
    return {
      matched: true,
      intent: `Search Wikipedia for "${query}"`,
      target: 'Wikipedia Knowledge Base',
      responseSpeech: `Searching Wikipedia for ${query}...`,
      responseArabic: `جاري فتح ويكيبيديا والبحث عن ${query}...`,
      actionType: 'web',
      webUrl: url,
    };
  }

  // 4. Greetings & Hello Triggers ONLY if it's purely a greeting (not an action command)
  const hasActionKeywords = hasWord(
    'open', 'launch', 'run', 'play', 'close', 'kill', 'terminate', 'screenshot', 'weather', 'search',
    'افتح', 'شغل', 'شغلي', 'اقفل', 'مسح', 'احذف', 'صور', 'طقس', 'ابحث', 'اعمل', 'وريني'
  ) || text.length > 35;

  if (!hasActionKeywords && hasWord('hi', 'hello', 'hey', 'yo', 'sup', 'hallo', 'greetings', 'هاي', 'هالو', 'اهلا', 'أهلا', 'أهلاً', 'اهلاً', 'مرحبا', 'مرحب', 'سلام', 'السلام عليكم', 'منور')) {
    return {
      matched: true,
      intent: 'Greeting & Operational Readiness Check',
      target: 'VISION Core',
      responseSpeech: 'Online and ready at your service, Ahmed. How can I assist you?',
      responseArabic: 'أهلاً يا أحمد، أنظمة VISION جاهزة وتحت أمرك.',
      actionType: 'chat',
    };
  }

  if (!hasActionKeywords && (text.includes('good morning') || text.includes('صباح الخير') || text.includes('صباح النور'))) {
    return {
      matched: true,
      intent: 'Morning Protocol & System Readiness',
      target: 'VISION Core',
      responseSpeech: `Good morning Sir. All telemetry systems are online. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}.`,
      responseArabic: `صباح الخير يا فندم. كل أنظمة VISION جاهزة وتحت أمرك.`,
      actionType: 'chat',
    };
  }

  if (text.includes('good evening') || text.includes('مساء الخير') || text.includes('مساء النور')) {
    return {
      matched: true,
      intent: 'Evening Protocol',
      target: 'VISION Core',
      responseSpeech: 'Good evening Sir. Standing by for commands.',
      responseArabic: 'مساء النور يا فندم. أنا في انتظار أوامرك.',
      actionType: 'chat',
    };
  }

  if (text.includes('goodnight') || text.includes('good night') || text.includes('تصبح على خير') || text.includes('تصبح ع خير') || text.includes('نام يا فيجن') || text.includes('نام يا جارفيس')) {
    return {
      matched: true,
      intent: 'Standby Power Mode',
      target: 'VISION Core',
      responseSpeech: 'Goodnight Sir. Systems switching to low-power background monitoring.',
      responseArabic: 'تصبح على خير يا فندم، سأبقى في وضع المراقبة الهادئ.',
      actionType: 'chat',
    };
  }

  if (hasWord('how are you', 'how r u', 'are you fine', 'are you ok', 'ازيك', 'عامل ايه', 'اخبارك', 'شغال ولا ايه', 'تمام')) {
    return {
      matched: true,
      intent: 'Health & Readiness Status Check',
      target: 'VISION Core',
      responseSpeech: 'I am operating at peak efficiency Sir. Ready for your instructions.',
      responseArabic: 'أنا بأفضل حال وكل الأنظمة تعمل بكفاءة قصوى، جاهز لأي مهمة.',
      actionType: 'chat',
    };
  }

  if (hasWord('who are you', 'what are you', 'your name', 'مين انت', 'انت مين', 'اسمك ايه', 'عرف نفسك')) {
    return {
      matched: true,
      intent: 'System Identity Report',
      target: 'VISION Operating System',
      responseSpeech: 'I am VISION, your Personal AI Operating System.',
      responseArabic: 'أنا فيجن (VISION)، نظام تشغيل الذكاء الاصطناعي الخاص بك.',
      actionType: 'chat',
    };
  }

  // 5. System Clock & Calendar
  if (hasWord('time', 'what time', 'what time is it', 'clock', 'الساعة كام', 'الساعه كام', 'الوقت كام', 'الوقت')) {
    const timeEn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeAr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return {
      matched: true,
      intent: 'Query Hardware Clock',
      target: 'Local Hardware RTC',
      responseSpeech: `The current time is ${timeEn}.`,
      responseArabic: `الوقت الآن هو ${timeAr}.`,
      actionType: 'system',
    };
  }

  if (hasWord('date', 'today', 'today date', 'النهارده ايه', 'النهاردة ايه', 'التاريخ كام', 'تاريخ اليوم', 'التاريخ')) {
    const dateEn = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      matched: true,
      intent: 'Query System Calendar',
      target: 'System Calendar',
      responseSpeech: `Today is ${dateEn}.`,
      responseArabic: `اليوم هو ${dateAr}.`,
      actionType: 'system',
    };
  }

  // 6. Live Weather & Environmental Intelligence
  if (
    hasWord(
      'weather', 'temperature', 'forecast', 'what is the weather', 'how is the weather', 'temp',
      'الطقس', 'الجو', 'درجة الحرارة', 'درجه الحراره', 'حالة الطقس', 'كام درجة الحرارة', 'حالة الجو', 'المطر'
    ) ||
    text.includes('temperature now') ||
    text.includes('what is the temperature') ||
    text.includes('the temperature') ||
    text.includes('درجة الحرارة كام') ||
    text.includes('درجه الحراره كام')
  ) {
    let targetCity: string | undefined;
    const cityMatchEn = text.match(/(?:in|for|at)\s+([a-zA-Z\s]+)/i);
    const cityMatchAr = text.match(/(?:في|بـ|ب)\s+([\u0600-\u06FF\s]+)/i);
    if (cityMatchEn && cityMatchEn[1]) {
      targetCity = cityMatchEn[1].trim();
    } else if (cityMatchAr && cityMatchAr[1]) {
      targetCity = cityMatchAr[1].trim();
    }

    return {
      matched: true,
      intent: 'Live Meteorological & Environmental Query',
      target: 'VISION Weather Engine (Open-Meteo)',
      responseSpeech: 'Checking current temperature and weather conditions now, Ahmed.',
      responseArabic: 'جاري فحص حالة الطقس ودرجات الحرارة الحية لموقعك الآن يا أحمد.',
      actionType: 'weather',
      targetCity,
    };
  }

  // 7. Native Applications Launching & Management
  // 7.1 VS Code with Project Directory support
  if (
    text.includes('open the project in vs code') || 
    text.includes('open project in vs code') || 
    text.includes('open project in code') || 
    text.includes('open my project') || 
    text.includes('افتح المشروع') || 
    text.includes('افتح البروجكت')
  ) {
    return {
      matched: true,
      intent: 'Launch Workspace in Visual Studio Code',
      target: 'Visual Studio Code',
      responseSpeech: 'Opening VISION project in Visual Studio Code, Ahmed.',
      responseArabic: 'جاري فتح مشروعك في برنامج فيجوال ستوديو كود يا أحمد.',
      actionType: 'app',
      appCommand: 'code',
      appArgs: ['G:/work/VISION'],
    };
  }

  if (text.includes('open vs code') || text.includes('open code') || text.includes('افتح كود') || text.includes('افتح فيجوال') || text.includes('launch vs code') || text === 'code') {
    return {
      matched: true,
      intent: 'Launch Development Environment',
      target: 'Visual Studio Code',
      responseSpeech: 'Opening Visual Studio Code.',
      responseArabic: 'جاري فتح برنامج فيجوال ستوديو كود.',
      actionType: 'app',
      appCommand: 'code',
    };
  }

  // YouTube Direct Launch Rule
  if (text.includes('open youtube') || text.includes('افتح يوتيوب') || text.includes('شغل يوتيوب') || text.includes('يوتيوب') || text === 'youtube') {
    return {
      matched: true,
      intent: 'Launch YouTube Media Platform',
      target: 'YouTube',
      responseSpeech: 'Opening YouTube in browser.',
      responseArabic: 'جاري فتح موقع يوتيوب في المتصفح.',
      actionType: 'web',
      webUrl: 'https://www.youtube.com',
    };
  }

  // Web Browser / New Tab Rule
  if (text.includes('open chrome') || text.includes('افتح كروم') || text.includes('open browser') || text.includes('افتح المتصفح') || text.includes('المتصفح') || text.includes('open edge') || text === 'chrome' || text === 'edge') {
    return {
      matched: true,
      intent: 'Launch Web Browser',
      target: 'Web Browser',
      responseSpeech: 'Opening web browser.',
      responseArabic: 'جاري فتح المتصفح وتبويب جديد.',
      actionType: 'web',
      webUrl: 'https://www.google.com',
    };
  }

  if (text.includes('open spotify') || text.includes('افتح سبوتيفاي') || text.includes('شغل سبوتيفاي') || text === 'spotify') {
    return {
      matched: true,
      intent: 'Launch Media Player',
      target: 'Spotify',
      responseSpeech: 'Launching Spotify.',
      responseArabic: 'جاري فتح تطبيق سبوتيفاي.',
      actionType: 'app',
      appCommand: 'spotify',
    };
  }

  if (text.includes('open notepad') || text.includes('افتح النوت باد') || text.includes('افتح المفكرة') || text === 'notepad') {
    return {
      matched: true,
      intent: 'Launch Text Editor',
      target: 'Notepad',
      responseSpeech: 'Opening Notepad.',
      responseArabic: 'جاري فتح برنامج المفكرة Notepad.',
      actionType: 'app',
      appCommand: 'notepad',
    };
  }

  if (text.includes('open calculator') || text.includes('open calc') || text.includes('افتح الحاسبة') || text.includes('الالة الحاسبة') || text === 'calc') {
    return {
      matched: true,
      intent: 'Launch Calculator Utility',
      target: 'Windows Calculator',
      responseSpeech: 'Opening Calculator.',
      responseArabic: 'جاري فتح الآلة الحاسبة.',
      actionType: 'app',
      appCommand: 'calc',
    };
  }

  if (text.includes('open terminal') || text.includes('open powershell') || text.includes('افتح التيرمينال') || text.includes('افتح سطر الاوامر')) {
    return {
      matched: true,
      intent: 'Launch Command Terminal',
      target: 'Windows Terminal',
      responseSpeech: 'Opening Terminal environment.',
      responseArabic: 'جاري فتح شاشة الأوامر Terminal.',
      actionType: 'app',
      appCommand: 'powershell',
    };
  }

  if (text.includes('open explorer') || text.includes('open files') || text.includes('افتح الملفات') || text.includes('افتح الفايل اكسبلورر')) {
    return {
      matched: true,
      intent: 'Launch File Explorer',
      target: 'Windows File Explorer',
      responseSpeech: 'Opening File Explorer.',
      responseArabic: 'جاري فتح مستعرض الملفات File Explorer.',
      actionType: 'app',
      appCommand: 'explorer',
    };
  }

  if (text.includes('open task manager') || text.includes('افتح التاسك مانجر') || text.includes('مدير المهام')) {
    return {
      matched: true,
      intent: 'Launch Task Manager',
      target: 'Windows Task Manager',
      responseSpeech: 'Opening Windows Task Manager.',
      responseArabic: 'جاري فتح مدير المهام Task Manager.',
      actionType: 'app',
      appCommand: 'taskmgr',
    };
  }

  // 7.2 Close / Terminate Application Triggers
  if (text.startsWith('close ') || text.startsWith('kill ') || text.startsWith('اقفل ') || text.startsWith('اغلق ')) {
    let appToClose = '';
    if (text.includes('chrome') || text.includes('كروم') || text.includes('browser') || text.includes('المتصفح') || text.includes('edge')) appToClose = 'browser';
    else if (text.includes('vs code') || text.includes('code') || text.includes('كود') || text.includes('فيجوال')) appToClose = 'code';
    else if (text.includes('spotify') || text.includes('سبوتيفاي')) appToClose = 'spotify';
    else if (text.includes('notepad') || text.includes('المفكرة') || text.includes('النوت باد')) appToClose = 'notepad';
    else if (text.includes('calc') || text.includes('الحاسبة')) appToClose = 'calc';
    else if (text.includes('terminal') || text.includes('التيرمينال')) appToClose = 'powershell';

    if (appToClose) {
      return {
        matched: true,
        intent: `Terminate Application (${appToClose})`,
        target: appToClose,
        responseSpeech: `Closing ${appToClose}, Ahmed.`,
        responseArabic: `جاري إغلاق ${appToClose} الآن يا أحمد.`,
        actionType: 'app_close',
        appCommand: appToClose,
      };
    }
  }

  // 7.3 Detect / List Running Applications
  if (
    text.includes('running apps') || 
    text.includes('what apps are running') || 
    text.includes('list apps') || 
    text.includes('show open windows') || 
    text.includes('البرامج الشغالة') || 
    text.includes('ايه البرامج المفتوحة') || 
    text.includes('البرامج المفتوحة') ||
    text.includes('العمليات الشغالة')
  ) {
    return {
      matched: true,
      intent: 'Enumerate Running Applications & Windows',
      target: 'Windows Process Manager',
      responseSpeech: 'Scanning currently active windowed applications on your system, Ahmed.',
      responseArabic: 'جاري فحص النوافذ والتطبيقات النشطة على جهازك الآن يا أحمد.',
      actionType: 'app_list',
    };
  }

  // 7. Web Applications Direct Access
  const webApps: Record<string, { url: string; labelEn: string; labelAr: string }> = {
    'youtube': { url: 'https://www.youtube.com', labelEn: 'YouTube', labelAr: 'يوتيوب' },
    'يوتيوب': { url: 'https://www.youtube.com', labelEn: 'YouTube', labelAr: 'يوتيوب' },
    'google': { url: 'https://www.google.com', labelEn: 'Google', labelAr: 'جوجل' },
    'جوجل': { url: 'https://www.google.com', labelEn: 'Google', labelAr: 'جوجل' },
    'github': { url: 'https://www.github.com', labelEn: 'GitHub', labelAr: 'جيت هاب' },
    'جيتهاب': { url: 'https://www.github.com', labelEn: 'GitHub', labelAr: 'جيت هاب' },
    'whatsapp': { url: 'https://web.whatsapp.com', labelEn: 'WhatsApp Web', labelAr: 'واتساب' },
    'واتساب': { url: 'https://web.whatsapp.com', labelEn: 'WhatsApp Web', labelAr: 'واتساب' },
    'facebook': { url: 'https://www.facebook.com', labelEn: 'Facebook', labelAr: 'فيسبوك' },
    'فيسبوك': { url: 'https://www.facebook.com', labelEn: 'Facebook', labelAr: 'فيسبوك' },
    'instagram': { url: 'https://www.instagram.com', labelEn: 'Instagram', labelAr: 'انستجرام' },
    'انستجرام': { url: 'https://www.instagram.com', labelEn: 'Instagram', labelAr: 'انستجرام' },
    'twitter': { url: 'https://www.x.com', labelEn: 'X (Twitter)', labelAr: 'تويتر' },
    'تويتر': { url: 'https://www.x.com', labelEn: 'X (Twitter)', labelAr: 'تويتر' },
    'linkedin': { url: 'https://www.linkedin.com', labelEn: 'LinkedIn', labelAr: 'لينكد إن' },
    'لينكد': { url: 'https://www.linkedin.com', labelEn: 'LinkedIn', labelAr: 'لينكد إن' },
  };

  for (const [key, val] of Object.entries(webApps)) {
    if (text.includes(`open ${key}`) || text.includes(`افتح ${key}`) || text === key) {
      window.open(val.url, '_blank');
      return {
        matched: true,
        intent: `Navigate to ${val.labelEn}`,
        target: val.labelEn,
        responseSpeech: `Opening ${val.labelEn}.`,
        responseArabic: `جاري فتح ${val.labelAr}.`,
        actionType: 'web',
        webUrl: val.url,
      };
    }
  }

  // 8.1 Windows PC Shutdown & Restart (Operating System & Hardware)
  const isTargetingPC =
    text.includes('الكمبيوتر') ||
    text.includes('الجهاز') ||
    text.includes('البي سي') ||
    text.includes('pc') ||
    text.includes('computer') ||
    text.includes('ويندوز') ||
    text.includes('windows') ||
    text.includes('فورس') ||
    text.includes('force');

  const isNegatingSelfClose =
    text.includes('مش عايزك تغلق') ||
    text.includes('مش تغلق') ||
    text.includes('مش عايزك تقفل') ||
    text.includes('مش تقفل') ||
    text.includes('مش تخرج') ||
    text.includes('لا تغلق') ||
    text.includes('لا تقفل') ||
    text.includes('بدون ما تقفل');

  if (
    isTargetingPC &&
    (
      text.includes('شات داون') ||
      text.includes('شوت داون') ||
      text.includes('shutdown') ||
      text.includes('shut down') ||
      text.includes('اغلاق') ||
      text.includes('إغلاق') ||
      text.includes('اقفل') ||
      text.includes('اطفي') ||
      text.includes('اطفئ') ||
      text.includes('قفل') ||
      text.includes('اعادة تشغيل') ||
      text.includes('إعادة تشغيل') ||
      text.includes('ريستارت') ||
      text.includes('restart')
    )
  ) {
    const isRestart = text.includes('اعادة تشغيل') || text.includes('إعادة تشغيل') || text.includes('ريستارت') || text.includes('restart');
    return {
      matched: true,
      intent: isRestart ? 'Restart Windows PC' : 'Force Shutdown Windows PC',
      target: 'Windows Operating System',
      responseSpeech: isRestart
        ? 'Restarting your computer now, Ahmed. See you soon.'
        : 'Shutting down your computer completely now, Ahmed. Goodbye.',
      responseArabic: isRestart
        ? 'جاري إعادة تشغيل جهاز الكمبيوتر فوراً يا أحمد. ألقاك قريباً.'
        : 'جاري إغلاق جهاز الكمبيوتر بشكل كامل وإجباري يا أحمد. مع السلامة.',
      actionType: 'system',
      appCommand: isRestart ? 'restart_pc' : 'shutdown_pc',
    };
  }

  // 8.2 Shutdown & Exit VISION Assistant ONLY (Desktop App Window)
  if (
    !isTargetingPC &&
    !isNegatingSelfClose &&
    (
      hasWord('مع السلامة', 'باي', 'سلام', 'وداعا', 'وداعاً', 'وداع') ||
      text.includes('اقفل نفسك') ||
      text.includes('اقفل البرنامج') ||
      text.includes('اغلق البرنامج') ||
      text.includes('اقفل يا فيجن') ||
      text.includes('اخرج') ||
      text === 'exit' ||
      text === 'quit' ||
      text.includes('مع السلامة يا فيجن') ||
      text === 'close vision' ||
      text === 'exit vision' ||
      text === 'شات داون' ||
      text === 'shutdown'
    )
  ) {
    return {
      matched: true,
      intent: 'Shutdown & Exit VISION Assistant',
      target: 'VISION Desktop Application',
      responseSpeech: 'Goodbye Ahmed, shutting down VISION now.',
      responseArabic: 'مع السلامة يا أحمد، تم إغلاق نظام VISION بنجاح.',
      actionType: 'system',
      appCommand: 'exit',
    };
  }

  // 8.1 Diagnostics & Telemetry Live Report
  if (
    text === 'النظام' ||
    text === 'النظام.' ||
    text === 'السيستم' ||
    text === 'السيستم.' ||
    text === 'system' ||
    text === 'status' ||
    hasWord('diagnostics', 'telemetry', 'health', 'افحص النظام', 'تشخيص', 'فحص', 'حالة النظام', 'تقرير النظام', 'حالة العتاد', 'حالة المعالج', 'حالة كارت الشاشة', 'كارت الشاشة', 'gpu')
  ) {
    return {
      matched: true,
      intent: 'Execute Diagnostic Telemetry Probe',
      target: 'VISION Telemetry Core',
      responseSpeech: 'Hardware running smoothly on NVIDIA RTX 3060. All local AI models are fully operational.',
      responseArabic: 'حالة النظام ممتازة يا أحمد: معالج الرسوميات RTX 3060 وجميع نماذج الذكاء الاصطناعي المحلية تعمل بكفاءة تامة.',
      actionType: 'system',
      appCommand: 'telemetry_report',
    };
  }

  // 9. Native Screenshot & Visual Perception Tool
  if (
    text.includes('screenshot') ||
    text.includes('screen shot') ||
    text.includes('capture screen') ||
    text.includes('take a screenshot') ||
    text.includes('take screenshot') ||
    text.includes('take a full screenshot') ||
    text.includes('full screenshot') ||
    text.includes('سكرين شوت') ||
    text.includes('سكرين') ||
    text.includes('صور الشاشة') ||
    text.includes('لقطة شاشة') ||
    text.includes('صور الشاشه')
  ) {
    const hasAnalysisIntent = 
      text.includes('حلل') || 
      text.includes('افحص') || 
      text.includes('شوف') || 
      text.includes('اقرأ') || 
      text.includes('اقرا') || 
      text.includes('اشرح') || 
      text.includes('analyze') || 
      text.includes('inspect') || 
      text.includes('read') || 
      text.includes('explain') || 
      text.includes('error') || 
      text.includes('ايرور') ||
      text.includes('مشكلة');

    if (hasAnalysisIntent) {
      // Escalate to Agent Core with Computer Vision capabilities
      return {
        matched: false,
        intent: 'Multimodal Computer Vision & Visual Screen Analysis',
        target: 'VISION Vision Core (Qwen3-VL on RTX 3060)',
        responseSpeech: '',
        responseArabic: '',
        actionType: 'chat',
      };
    }

    const isSecondScreen = 
      text.includes('second') || 
      text.includes('2') || 
      text.includes('تانية') || 
      text.includes('ثانية') || 
      text.includes('other') || 
      text.includes('أخرى');
    const screenIndex = isSecondScreen ? 1 : 0;

    return {
      matched: true,
      intent: isSecondScreen ? 'Display 2 (Second Monitor) Capture' : 'Display 1 Visual Capture',
      target: 'VISION Screen Engine',
      responseSpeech: isSecondScreen 
        ? 'Capturing the second display (Screen 2) now, Ahmed.' 
        : 'Capturing primary screen display now, Ahmed.',
      responseArabic: isSecondScreen 
        ? 'جاري التقاط لقطة شاشة للشاشة الثانية وحفظها الآن يا أحمد.' 
        : 'جاري التقاط لقطة الشاشة وحفظها الآن يا أحمد.',
      actionType: 'screenshot',
      screenIndex,
    };
  }

  // Not matched by static rule -> Escalate to Local Agent Core
  return {
    matched: false,
    intent: 'Complex Intent Analysis & Natural Reasoning',
    target: 'VISION Local Agent Core (Ollama Qwen3 8B)',
    responseSpeech: '',
    responseArabic: '',
    actionType: 'chat',
  };
}
