"""Local preview server for the app (no caching, so edits show up immediately).
Usage:  python tools/serve.py   then open http://localhost:8730
"""
import http.server, functools, os

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app')

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    handler = functools.partial(NoCache, directory=APP_DIR)
    print('Serving', os.path.abspath(APP_DIR), 'at http://localhost:8730')
    http.server.ThreadingHTTPServer(('', 8730), handler).serve_forever()
