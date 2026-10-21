"""
VISION Narration Audio Pre-Generation & Export Script
Batch generates high-quality WAV files for all fixed narration phrases
using the local VoiceTut-TTS server (port 8766), saving them into public/audio/narrations/
so that VISION can play them with ZERO latency and ZERO runtime GPU overhead.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import hashlib

TTS_URL = "http://127.0.0.1:8766/synthesize"
SPEAKER = "Ahmed"

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio", "narrations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Predefined phrases to pre-generate and export
PHRASES = [
    # 1. Immediate acknowledgements
    ("immediate_ack", "حاضر يا أحمد، شغال عليها..."),
    ("immediate_ack", "تمام يا فندم، ثواني..."),
    ("immediate_ack", "أمرك يا باشا، جاري التنفيذ..."),
    ("immediate_ack", "معاك يا أحمد، حالاً..."),
    ("immediate_ack", "واضح، ببدأ فيها فوراً..."),
    ("immediate_ack", "ثواني وهتكون جاهزة..."),
    ("immediate_ack", "تحت أمرك، شغال عليها دلوقتي..."),
    ("immediate_ack", "تمام، من عيوني..."),
    ("immediate_ack", "على طول يا أحمد..."),
    ("immediate_ack", "شغال يا فندم، ثواني وتخلص..."),
    ("immediate_ack", "أمرك، بنفذ المطلوب حالاً..."),
    ("immediate_ack", "Right away, Ahmed."),
    ("immediate_ack", "Got it, working on it now."),
    ("immediate_ack", "On it, Ahmed, just a moment."),

    # 2. Analyzing & planning
    ("analyzing", "بفحص طلبك وببدأ التنفيذ..."),
    ("analyzing", "تمام، برتب الخطوات المطلوبة..."),
    ("analyzing", "دقيقة برتب الإجراء المناسب..."),
    ("analyzing", "بفهم التفاصيل وأنفذ حالاً..."),
    ("analyzing", "بحلل الخطوات وبدخل في التنفيذ..."),
    ("analyzing", "ثواني براجع المطلوب بالضبط..."),
    ("analyzing", "تمام، شغال على تجهيز المهمة..."),
    ("analyzing", "بشوف أنسب مسار للطلب..."),

    # 3. Deep thinking & logic
    ("thinking", "بشوف أفضل طريقة لتنفيذها..."),
    ("thinking", "براجع الإجراءات لضمان دقة التنفيذ..."),
    ("thinking", "ثواني برتب الأوامر المناسبة..."),
    ("thinking", "تمام، بحدد أنسب خيار..."),
    ("thinking", "بجهز الإجراء السليم دلوقتي..."),
    ("thinking", "دقيقة برتب منطق الحل..."),
    ("thinking", "بفحص الخيارات المتاحة للنظام..."),

    # 4. Computer vision & screen inspect
    ("screen_vision", "بفحص الشاشة بصرياً دلوقتي..."),
    ("screen_vision", "باخد لقطة وبحلل اللي ظاهر قدامك..."),
    ("screen_vision", "ثواني وبشوف محتوى الشاشة بنموذج الرؤية..."),
    ("screen_vision", "بقرأ العناصر والنوافذ المفتوحة..."),
    ("screen_vision", "جاري التقاط الشاشة وتحليلها..."),

    # 5. Shell commands & terminal
    ("execute_command", "بشغل الأمر المطلوب في النظام..."),
    ("execute_command", "تمام، بنفذ الأمر عبر الكونسول..."),
    ("execute_command", "ثواني والأمر يتنفذ..."),
    ("execute_command", "جاري تنفيذ الأمر ومتابعة النتيجة..."),
    ("execute_command", "أمرك، بشغل الأمر في الخلفية..."),

    # 6. Step success
    ("step_success", "الخطوة دي تمت، ومكملين..."),
    ("step_success", "تمام، دي خلصت وداخل على اللي بعدها..."),
    ("step_success", "تمام كدة، شغال على باقي الإجراء..."),
    ("step_success", "تمام التمام، مكمل باقي الخطوات..."),
    ("step_success", "الخطوة دي تمام، بنتقل للنقطة التالية..."),
    ("step_success", "تمام، مستمر في التنفيذ..."),

    # 7. Task done
    ("task_done", "كده تمام يا أحمد، نفذت المطلوب."),
    ("task_done", "خلصت كل الإجراءات بنجاح يا باشا."),
    ("task_done", "تمام يا أحمد، العملية اكتملت بالكامل."),
    ("task_done", "جاهز يا فندم، نفذت المطلوب كله."),
    ("task_done", "تمام، كل المهام خلصت بنجاح."),
    ("task_done", "كده جاهز ومستعد لأي أمر جديد يا أحمد."),
    ("task_done", "All set, Ahmed! Finished."),
]

def synthesize_and_save(category: str, text: str, index: int) -> dict:
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    filename = f"{category}_{index:02d}_{text_hash}.wav"
    out_path = os.path.join(OUTPUT_DIR, filename)

    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        print(f"[CACHE HIT] Already exists: {filename} -> '{text}'")
        return {"category": category, "text": text, "file": filename, "rel_path": f"/audio/narrations/{filename}"}

    payload = json.dumps({"text": text, "speaker": SPEAKER}).encode('utf-8')
    req = urllib.request.Request(
        TTS_URL,
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            audio_bytes = resp.read()
            with open(out_path, "wb") as f:
                f.write(audio_bytes)
            print(f"[SUCCESS] Exported {filename} ({len(audio_bytes)} bytes) -> '{text}'")
            return {"category": category, "text": text, "file": filename, "rel_path": f"/audio/narrations/{filename}"}
    except Exception as e:
        print(f"[ERROR] Failed to synthesize '{text}': {e}")
        return None

def main():
    print(f"=== VISION Narration Audio Pre-Generator ===")
    print(f"Target directory: {OUTPUT_DIR}")
    print(f"Connecting to TTS Server: {TTS_URL}")

    manifest = []
    category_counts = {}

    for cat, text in PHRASES:
        category_counts[cat] = category_counts.get(cat, 0) + 1
        item = synthesize_and_save(cat, text, category_counts[cat])
        if item:
            manifest.append(item)

    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] Successfully exported {len(manifest)} audio files to {OUTPUT_DIR}")
    print(f"Manifest written to: {manifest_path}")

if __name__ == "__main__":
    main()
