import sys
import os
import json
import threading
import time
import atexit
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

import warnings
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", message=".*ffmpeg.*")

# Ensure UTF-8 output encoding for Arabic text logs
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Path configuration
services_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(services_dir)
if services_dir not in sys.path:
    sys.path.insert(0, services_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Set HF cache path if not set
if "HF_HOME" not in os.environ and os.path.exists("E:\\VISION\\hf_cache"):
    os.environ["HF_HOME"] = "E:\\VISION\\hf_cache"
    os.environ["HF_HUB_CACHE"] = "E:\\VISION\\hf_cache\\hub"

LOG_FILE = os.path.join(services_dir, "tts_server.log")

def server_log(msg: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}\n"
    sys.stdout.write(line)
    sys.stdout.flush()
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass

def on_exit():
    server_log("[VISION TTS Server] Server process exiting (atexit called).")

atexit.register(on_exit)

import config

from tts import get_tts_provider, TTSError, EmptyTextError, InvalidSpeakerError

provider = get_tts_provider()

def preload_provider():
    try:
        server_log("[VISION TTS Server] Preloading VoiceTut-TTS on GPU...")
        provider.load()
        server_log("[VISION TTS Server] VoiceTut-TTS is ready for real-time speech synthesis.")
    except Exception as e:
        server_log(f"[VISION TTS Server Error during preload] {e}")

class TTSServerHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        try:
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
            self.send_header("Access-Control-Expose-Headers", "Content-Length, X-Sample-Rate, X-Duration, X-Speaker")
            self.end_headers()
        except Exception:
            pass

    def do_GET(self):
        try:
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                health_data = provider.health()
                health_data["status"] = "ready" if provider.is_loaded() else "loading"
                self.wfile.write(json.dumps(health_data, ensure_ascii=False).encode("utf-8"))
            elif self.path == "/speakers":
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "speakers": provider.list_speakers(),
                    "default": getattr(provider, "default_speaker", "Ahmed")
                }).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass
        except Exception as e:
            server_log(f"[VISION TTS Server GET Error] {e}")

    def do_POST(self):
        if self.path == "/synthesize":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")

                if not body.strip():
                    self.send_error_response(400, "EMPTY_REQUEST", "Request body is empty")
                    return

                try:
                    payload = json.loads(body)
                except Exception:
                    self.send_error_response(400, "INVALID_JSON", "Invalid JSON payload")
                    return

                text = payload.get("text", "").strip()
                speaker = payload.get("speaker")

                if not text:
                    self.send_error_response(400, "EMPTY_TEXT", "Field 'text' cannot be empty")
                    return

                # Wait gracefully if model is currently initializing
                wait_sec = 0
                while not provider.is_loaded() and wait_sec < 30:
                    time.sleep(0.5)
                    wait_sec += 0.5

                if not provider.is_loaded():
                    self.send_error_response(503, "TTS_NOT_READY", "Voice model is still loading, please retry in a moment")
                    return

                server_log(f"[TTS] Synthesizing ({len(text)} chars, speaker: '{speaker or getattr(provider, 'default_speaker', 'Ahmed')}'): \"{text[:60]}...\"")

                # Perform synthesis
                result = provider.synthesize(text, speaker=speaker)

                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Expose-Headers", "Content-Length, X-Sample-Rate, X-Duration, X-Speaker")
                self.send_header("X-Sample-Rate", str(result.sample_rate))
                self.send_header("X-Duration", f"{result.duration:.2f}" if result.duration else "0.0")
                self.send_header("X-Speaker", result.speaker)
                self.send_header("Content-Length", str(len(result.audio_bytes)))
                self.end_headers()

                self.wfile.write(result.audio_bytes)

            except InvalidSpeakerError as err:
                self.send_error_response(400, "INVALID_SPEAKER", str(err))
            except EmptyTextError as err:
                self.send_error_response(400, "EMPTY_TEXT", str(err))
            except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
                pass
            except Exception as err:
                server_log(f"[VISION TTS Server Error] {err}")
                self.send_error_response(500, "TTS_SYNTHESIS_FAILED", str(err))

        elif self.path == "/unload":
            try:
                provider.unload()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "unloaded"}).encode("utf-8"))
            except Exception as err:
                self.send_error_response(500, "UNLOAD_FAILED", str(err))
        else:
            self.send_response(404)
            self.end_headers()

    def send_error_response(self, code: int, error_code: str, message: str):
        try:
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "code": error_code,
                "message": message
            }, ensure_ascii=False).encode("utf-8"))
        except Exception:
            pass

    def log_message(self, format, *args):
        # Suppress standard noisy access log in favor of server_log
        return

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # Suppress client disconnection socket tracebacks
        pass

def run_server(port=None):
    if port is None:
        port = int(os.environ.get("TTS_SERVICE_PORT", 8766))
    host = os.environ.get("TTS_SERVICE_HOST", "127.0.0.1")

    server_log(f"[VISION TTS Server] Starting TTS server on {host}:{port}...")

    # Preload VoiceTut model in background thread
    t = threading.Thread(target=preload_provider, daemon=True)
    t.start()

    server = ThreadedHTTPServer((host, port), TTSServerHandler)
    server_log(f"[VISION TTS Server] Listening on http://{host}:{port} (Resilient Threaded Mode Active)")

    while True:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server_log("[VISION TTS Server] KeyboardInterrupt received. Exiting.")
            break
        except BaseException as e:
            server_log(f"[VISION TTS Server Resilience] Exception caught in serve_forever loop: {type(e).__name__}: {e}")
            time.sleep(0.5)

if __name__ == "__main__":
    try:
        run_server()
    except BaseException as e:
        server_log(f"[VISION TTS Server Fatal] Fatal unhandled exception: {type(e).__name__}: {e}")
        raise
