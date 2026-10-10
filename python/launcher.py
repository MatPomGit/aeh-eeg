"""Windows entry point for the bundled Streamlit teaching application."""
import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path


def resource(filename):
    return Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent)) / filename


def open_browser(port):
    for _ in range(120):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                webbrowser.open(f'http://127.0.0.1:{port}')
                return
        except OSError:
            time.sleep(0.25)
    print('Nie udało się otworzyć strony. Sprawdź komunikaty w konsoli.')


def configure_console_encoding():
    """Avoid UnicodeEncodeError on Windows consoles with legacy code pages."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            try:
                stream.reconfigure(errors='backslashreplace')
            except (OSError, ValueError):
                pass


def main():
    configure_console_encoding()
    app = resource('vizja_eeg_lab.py')
    if not app.is_file():
        raise FileNotFoundError(f'Brak pliku aplikacji: {app}')
    os.environ['VIZJA_BOOT'] = '1'
    os.environ['STREAMLIT_BROWSER_GATHER_USAGE_STATS'] = 'false'
    os.environ['MPLBACKEND'] = 'Agg'
    os.environ['STREAMLIT_SERVER_HEADLESS'] = 'true'
    # Frozen executable is a production deployment, not Streamlit development mode.
    os.environ['STREAMLIT_GLOBAL_DEVELOPMENT_MODE'] = 'false'
    from streamlit.web import cli as stcli
    port = 8501
    # Fixed port: clear message if another instance already occupies it.
    sys.argv = ['streamlit', 'run', str(app),
                '--global.developmentMode=false',
                '--server.address=127.0.0.1', f'--server.port={port}',
                '--server.headless=true', '--browser.gatherUsageStats=false',
                '--server.fileWatcherType=none']
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    print('Vizja-EEG-Lab: http://127.0.0.1:8501')
    print('Zamknij to okno, aby zakończyć działanie aplikacji.')
    stcli.main()


if __name__ == '__main__':
    main()
