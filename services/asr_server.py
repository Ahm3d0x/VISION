import sys
import os
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

import warnings
warnings.filterwarnings("ignore")
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

# Ensure UTF-8 output encoding for Arabic text logs
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Ensure project root is in sys.path
services_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(services_dir)
if services_dir not in sys.path:
    sys.path.insert(0, services_dir)
import time
import atexit
import signal

LOG_FILE = os.path.join(services_dir, "asr_server.log")

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
    server_log("[VISION ASR Server] Server process exiting (atexit called).")

atexit.register(on_exit)

import config

from asr import get_asr_provider

provider = get_asr_provider("qwen3")

def preload_provider():
    try:
        server_log("[VISION ASR Server] Preloading Qwen3-ASR 1.7B on GPU...")
        provider.load()
        server_log("[VISION ASR Server] Qwen3-ASR 1.7B is ready for real-time transcription.")
    except Exception as e:
        server_log(f"[VISION ASR Server Error during preload] {e}")

class ASRServerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                health_data = provider.health()
                health_data["status"] = "ready" if provider.is_loaded() else "loading"
                self.wfile.write(json.dumps(health_data).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass
        except Exception as e:
            print(f"[VISION ASR Server GET Error] {e}")

    def do_OPTIONS(self):
        try:
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
        except Exception:
            pass

    def do_POST(self):
        if self.path == "/transcribe":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                audio_bytes = self.rfile.read(content_length)

                if not audio_bytes or len(audio_bytes) < 100 or not audio_bytes.startswith(b"RIFF"):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"transcript": "", "language": "Arabic"}).encode("utf-8"))
                    return

                # Wait gracefully if model is still initializing checkpoint shards
                import time
                wait_sec = 0
                while not provider.is_loaded() and wait_sec < 25:
                    time.sleep(0.5)
                    wait_sec += 0.5

                if not provider.is_loaded():
                    self.send_response(503)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Model is still loading, please retry in a moment", "transcript": ""}).encode("utf-8"))
                    return

                res = provider.transcribe(audio_bytes, language="Arabic")
                server_log(f"[VISION ASR Server] Transcribed ({res.language}): \"{res.text}\"")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "transcript": res.text,
                    "language": res.language,
                }).encode("utf-8"))

            except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
                pass
            except Exception as err:
                print(f"[VISION ASR Server Error] {err}")
                sys.stdout.flush()
                try:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"transcript": "", "error": str(err)}).encode("utf-8"))
                except Exception:
                    pass

        elif self.path == "/unload":
            try:
                provider.unload()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "unloaded"}).encode("utf-8"))
            except Exception as err:
                try:
                    self.send_response(500)
                    self.end_headers()
                except Exception:
                    pass
        else:
            try:
                self.send_response(404)
                self.end_headers()
            except Exception:
                pass

    def log_message(self, format, *args):
        return

from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # Suppress client disconnection socket tracebacks
        pass

def run_server(port=8765):
    server_log("[VISION ASR Server] Starting ASR server initialization...")
    # Preload model in background thread
    t = threading.Thread(target=preload_provider, daemon=True)
    t.start()

    server = ThreadedHTTPServer(("127.0.0.1", port), ASRServerHandler)
    server_log(f"[VISION ASR Server] Listening on http://127.0.0.1:{port} (Threaded Resilience Active)")

    while True:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server_log("[VISION ASR Server] KeyboardInterrupt received. Exiting.")
            break
        except BaseException as e:
            server_log(f"[VISION ASR Server Resilience] Exception caught in serve_forever loop: {type(e).__name__}: {e}")
            time.sleep(0.5)

if __name__ == "__main__":
    try:
        run_server()
    except BaseException as e:
        server_log(f"[VISION ASR Server Fatal] Fatal unhandled exception: {type(e).__name__}: {e}")
        raise
