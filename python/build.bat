@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Brak launchera Python "py". Zainstaluj Python 3.11 lub 3.12 dla Windows.
  pause
  exit /b 1
)
py -3.11 -m venv .build-venv
if errorlevel 1 (
  echo Wymagany Python 3.11. 
  pause
  exit /b 1
)
call .build-venv\Scripts\activate.bat
python -m pip install --upgrade pip
if errorlevel 1 exit /b 1
python -m pip install -r requirements-build.txt
if errorlevel 1 exit /b 1
python -m PyInstaller --noconfirm --clean --onedir --console --name Vizja-EEG-Lab --icon vizja-eeg-lab.ico --add-data "vizja_eeg_lab.py;." --add-data "logo.png;." --collect-all streamlit --collect-all altair --collect-all pyarrow --collect-all mne --collect-all neurokit2 --collect-all edfio --collect-all matplotlib launcher.py
if errorlevel 1 exit /b 1
echo.
echo Gotowe: dist\Vizja-EEG-Lab\Vizja-EEG-Lab.exe
echo Skopiuj CALY katalog dist\Vizja-EEG-Lab, nie tylko plik .exe.
pause
