# Vizja-EEG-Lab dla Windows

Pakiet budowania programu dydaktycznego EEG na Windows 10/11 (64-bit).

## Pobieranie programu (bez Pythona)

**[Pobierz najnowszą wersję Vizja-EEG-Lab dla Windows](https://github.com/MatPomGit/aeh-eeg/releases/latest)**

Na stronie wydania pobierz `Vizja-EEG-Lab-Windows.zip`, rozpakuj **całe archiwum**, a następnie uruchom `Vizja-EEG-Lab.exe`. Katalog `_internal` musi pozostać obok pliku EXE.

Każda pomyślnie przetestowana kompilacja z gałęzi `main` jest publikowana automatycznie jako GitHub Release. Suma SHA-256 jest dostępna w osobnym pliku obok archiwum.

## Budowanie przez GitHub Actions

Wejdź w **Actions → Windows EXE → Run workflow**. Po pomyślnym teście artefakt `Vizja-EEG-Lab-Windows` można również pobrać bezpośrednio ze strony zadania.

## Alternatywnie: budowanie na własnym komputerze

Zainstaluj Python 3.11 (64-bit), uruchom `build.bat` na Windows.
Plik programu pojawi się w `dist/Vizja-EEG-Lab/Vizja-EEG-Lab.exe`.

## Uruchamianie

Program uruchamia lokalny serwer Streamlit i otwiera w domyślnej przeglądarce `http://127.0.0.1:8501`.
Nie wymaga konta Streamlit, usługi chmurowej ani dostępu do internetu podczas działania. Pierwsze uruchomienie trwa dłużej.

**Ważne:** program zostawia otwarte okno konsoli. Aby zakończyć jego działanie, zamknij to okno. Jeśli port 8501 jest zajęty, zamknij drugie wystąpienie aplikacji.

Program zawiera biblioteki MNE, edfio i NeuroKit2 do obsługi funkcji zależnych od tych pakietów. Rozmiar po kompilacji może być duży.

## Zakres weryfikacji

Budowanie i automatyczny test uruchomieniowy EXE na Windows odbywają się w GitHub Actions. Pomyślny test obejmuje start lokalnego serwera Streamlit i odpowiedź endpointu zdrowia. Nie zastępuje to pełnych testów funkcjonalnych interfejsu na komputerze docelowym.
