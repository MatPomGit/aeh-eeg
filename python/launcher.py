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


def main():
    app = resource('vizja_eeg_lab.py')
    if not app.is_file():
        raise FileNotFoundError(f'Brak pliku aplikacji: {app}')
    os.environ['VIZJA_BOOT'] = '1'
    os.environ['STREAMLIT_BROWSER_GATHER_USAGE_STATS'] = 'false'
    os.environ['MPLBACKEND'] = 'Agg'
    os.environ['STREAMLIT_SERVER_HEADLESS'] = 'true'
    from streamlit.web import cli as stcli
    port = 8501
    # Fixed port: clear message if another instance already occupies it.
    sys.argv = ['streamlit', 'run', str(app),
                '--server.address=127.0.0.1', f'--server.port={port}',
                '--server.headless=true', '--browser.gatherUsageStats=false',
                '--server.fileWatcherType=none']
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    print('Vizja-EEG-Lab: http://127.0.0.1:8501')
    print('Zamknij to okno, aby zakończyć działanie aplikacji.')
    stcli.main()


if __name__ == '__main__':
    main()
