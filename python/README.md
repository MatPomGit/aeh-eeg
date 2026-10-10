# Vizja-EEG-Lab dla Windows

Pakiet budowania programu dydaktycznego EEG na Windows 10/11 (64-bit).

## Najprostszy sposób: GitHub Actions

1. Umieść **całą zawartość tego pakietu** w repozytorium GitHub (łącznie z `.github/workflows/build-windows.yml`).
2. Wejdź w **Actions → Windows EXE → Run workflow**.
3. Poczekaj na pomyślny wynik zadania **windows**.
4. Na stronie zadania pobierz artefakt **Vizja-EEG-Lab-Windows** i rozpakuj ZIP.
5. Uruchom **Vizja-EEG-Lab.exe**. Pozostałe pliki z folderu muszą pozostać obok pliku EXE.

## Alternatywnie: budowanie na własnym komputerze

Zainstaluj Python 3.11 (64-bit), uruchom `build.bat` na Windows.
Plik programu pojawi się w `dist/Vizja-EEG-Lab/Vizja-EEG-Lab.exe`.

## Uruchamianie

Program uruchamia lokalny serwer Streamlit i otwiera w domyślnej przeglądarce `http://127.0.0.1:8501`.
Nie wymaga konta Streamlit, usługi chmurowej ani dostępu do internetu podczas działania. Pierwsze uruchomienie trwa dłużej.

**Ważne:** program zostawia otwarte okno konsoli. Aby zakończyć jego działanie, zamknij to okno. Jeśli port 8501 jest zajęty, zamknij drugie wystąpienie aplikacji.

Program zawiera biblioteki MNE, edfio i NeuroKit2 do obsługi funkcji zależnych od tych pakietów. Rozmiar po kompilacji może być duży.

## Zakres weryfikacji

Pakiet i składnia plików zostały sprawdzone na Linuksie. Kompilacja Windows i działanie EXE wymagają uruchomienia zadania GitHub Actions. Nie należy uznawać EXE za przetestowany, dopóki zadanie nie zakończy się sukcesem i nie zostanie wykonany test uruchomieniowy na Windows.
