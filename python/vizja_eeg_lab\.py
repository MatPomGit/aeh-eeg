"""
Vizja-EEG-Lab – prosta aplikacja dydaktyczna do wizualizacji i analizy sygnału EEG.
Uniwersytet Vizja, neuropsychologia.

Uruchomienie (wszystko dzieje się automatycznie – venv, instalacja, start):
    python vizja_eeg_lab.py
"""
import os
import subprocess
import sys
from pathlib import Path


def bootstrap():
    """Tworzy .venv obok skryptu, instaluje zależności i uruchamia aplikację w Streamlit."""
    import venv

    here = Path(__file__).resolve().parent
    vdir = here / ".venv"
    py = vdir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    run = lambda *a, **k: subprocess.run([str(py), *a], **k)

    if not py.exists():
        print("► Tworzenie środowiska wirtualnego (.venv)...")
        try:
            venv.create(vdir, with_pip=True)
        except Exception as e:
            sys.exit(f"Nie udało się utworzyć venv: {e}\n"
                     "Na Debian/Ubuntu: sudo apt install python3-venv")

    base = "import streamlit, numpy, scipy, matplotlib, pandas"
    if run("-c", base, capture_output=True).returncode:
        print("► Instalacja zależności (pierwsze uruchomienie może potrwać)...")
        r = run("-m", "pip", "install", "--upgrade", "pip", "streamlit",
                "numpy", "scipy", "matplotlib", "pandas")
        if r.returncode:
            sys.exit("Instalacja zależności nie powiodła się (sprawdź połączenie z internetem).")

    # mne + edfio + neurokit2 (EDF, FIF, BIDS, symulacja) – opcjonalne; jedna próba instalacji
    marker = vdir / ".mne_failed"
    if run("-c", "import mne, edfio, neurokit2", capture_output=True).returncode and not marker.exists():
        print("► Instalacja mne, edfio, neurokit2 (EDF/FIF/BIDS, symulacja NeuroKit2)...")
        if run("-m", "pip", "install", "mne", "edfio", "neurokit2").returncode:
            marker.touch()
            print("  Pominięto mne/edfio/neurokit2 – EDF, FIF, BIDS i generator NeuroKit2 niedostępne; reszta działa.")

    print("► Uruchamianie Vizja-EEG-Lab...")
    env = {**os.environ, "VIZJA_BOOT": "1"}
    try:
        sys.exit(run("-m", "streamlit", "run", str(Path(__file__).resolve()), env=env).returncode)
    except KeyboardInterrupt:
        sys.exit(0)


if os.environ.get("VIZJA_BOOT") != "1":
    bootstrap()

import base64
import io
import json
import re
import tempfile
import zipfile
from datetime import datetime

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
from scipy import signal
from scipy.integrate import trapezoid

try:
    import neurokit2 as nk
except Exception:
    nk = None

# Logo (opcjonalne): logo.png obok skryptu. Brak lub uszkodzony plik nie blokuje aplikacji.
LOGO = None
try:
    from PIL import Image

    _p = Path(__file__).resolve().parent / "logo.png"
    if _p.is_file():
        LOGO = Image.open(_p)
        LOGO.load()
except Exception:
    LOGO = None

st.set_page_config(page_title="Vizja-EEG-Lab", page_icon=LOGO or "🧠", layout="wide")
plt.rcParams.update({"font.size": 9, "axes.titlesize": 10, "figure.dpi": 110})

BANDS = {
    "Delta (0,5–4 Hz)": (0.5, 4),
    "Theta (4–8 Hz)": (4, 8),
    "Alfa (8–13 Hz)": (8, 13),
    "Beta (13–30 Hz)": (13, 30),
    "Gamma (30–45 Hz)": (30, 45),
}
COLORS = ["#6c8ebf", "#82b366", "#d79b00", "#b85450", "#9673a6"]


# ---------------------------------------------------------------- dane
def pink_noise(n, rng, amp):
    f = np.fft.rfftfreq(n)
    f[0] = 1
    spec = (rng.normal(size=f.size) + 1j * rng.normal(size=f.size)) / np.sqrt(f)
    x = np.fft.irfft(spec, n)
    return x / x.std() * amp


def synth_eeg(fs, dur, eyes_closed, blinks, mains, engine="numpy",
              alpha_hz=10.0, noise_uv=10.0, seed=1):
    """Sygnał syntetyczny: szum 1/f + rytmy theta/alfa/beta + opcjonalne artefakty.
    engine="neurokit2": szum różowy (nk.signal_noise) i rytmy (nk.signal_simulate)."""
    rng = np.random.default_rng(seed)
    n = int(dur * fs)
    t = np.arange(n) / fs
    chans = ["Fp1", "Cz", "O1", "O2"]
    alpha_amp = {"Fp1": 3, "Cz": 5, "O1": 15, "O2": 15} if eyes_closed else \
                {"Fp1": 2, "Cz": 2, "O1": 3, "O2": 3}
    mod = 1 + 0.3 * np.sin(2 * np.pi * 0.2 * t)  # powolna modulacja amplitudy alfa
    data = []
    for i, ch in enumerate(chans):
        if engine == "neurokit2":
            kw = dict(duration=dur, sampling_rate=int(fs), random_state=seed + i)
            x = nk.signal_noise(beta=1, **kw)[:n]
            x = x / x.std() * noise_uv
            alpha = nk.signal_simulate(frequency=alpha_hz, amplitude=alpha_amp[ch], noise=0, **kw)[:n]
            slow = nk.signal_simulate(frequency=[6, 20], amplitude=[2, 1.5], noise=0, **kw)[:n]
            # NeuroKit2 nie ustawia fazy – losowe przesunięcie różnicuje kanały
            alpha = np.roll(alpha, rng.integers(0, int(fs)))
            slow = np.roll(slow, rng.integers(0, int(fs)))
            x = x + alpha * mod + slow
        else:
            x = pink_noise(n, rng, noise_uv)
            x += alpha_amp[ch] * np.sin(2 * np.pi * alpha_hz * t + rng.uniform(0, 6)) * mod
            x += 2 * np.sin(2 * np.pi * 6 * t + rng.uniform(0, 6))     # theta
            x += 1.5 * np.sin(2 * np.pi * 20 * t + rng.uniform(0, 6))  # beta
        if blinks and ch == "Fp1":
            for tb in np.arange(2, dur, 4):
                x = x + 100 * np.exp(-((t - tb) ** 2) / (2 * 0.08 ** 2))
        if mains:  # 50 Hz: NeuroKit2 nie generuje tej częstotliwości przy Fs = 250 Hz
            x = x + 8 * np.sin(2 * np.pi * 50 * t)
        data.append(x)
    return pd.DataFrame(np.array(data).T, columns=chans)


def load_file(name, raw_bytes, fs_csv):
    """Wczytuje CSV lub EDF z bajtów. Zwraca (DataFrame [µV], Fs)."""
    if name.lower().endswith(".edf"):
        try:
            import mne
        except ImportError:
            raise RuntimeError("Do odczytu EDF zainstaluj bibliotekę: pip install mne")
        with tempfile.NamedTemporaryFile(suffix=".edf", delete=False) as tmp:
            tmp.write(raw_bytes)
        raw = mne.io.read_raw_edf(tmp.name, preload=True, verbose=False)
        return pd.DataFrame(raw.get_data().T * 1e6, columns=raw.ch_names), float(raw.info["sfreq"])
    return pd.read_csv(io.BytesIO(raw_bytes)), float(fs_csv)


@st.cache_data(show_spinner="⏳ Wczytywanie pliku…")
def cached_load(name, raw_bytes, fs_csv):
    return load_file(name, raw_bytes, fs_csv)


@st.cache_data(show_spinner="⏳ Generowanie sygnału…")
def cached_synth(*args):
    return synth_eeg(*args)


@st.cache_data(show_spinner="⏳ Filtrowanie sygnału…")
def preprocess(x, fs, hp, lp, notch):
    x = x - x.mean(axis=0)
    if hp or lp:
        hi = min(lp, fs / 2 - 1) if lp else None
        if hp and hi:
            sos = signal.butter(4, [hp, hi], "bandpass", fs=fs, output="sos")
        elif hp:
            sos = signal.butter(4, hp, "highpass", fs=fs, output="sos")
        else:
            sos = signal.butter(4, hi, "lowpass", fs=fs, output="sos")
        x = signal.sosfiltfilt(sos, x, axis=0)
    if notch and fs / 2 > 50:
        b, a = signal.iirnotch(50, 30, fs)
        x = signal.filtfilt(b, a, x, axis=0)
    return x


def band_powers(x, fs):
    f, p = signal.welch(x, fs, nperseg=min(len(x), int(2 * fs)))
    absolute = {n: trapezoid(p[(f >= lo) & (f < hi)], f[(f >= lo) & (f < hi)])
                for n, (lo, hi) in BANDS.items()}
    return f, p, absolute


# ================================================================ EKSPORT
FORMATS = {
    "CSV (.csv)": "csv",
    "NumPy (.npz)": "npz",
    "EDF (.edf)": "edf",
    "MNE-Python (.fif)": "fif",
    "BIDS-EEG (struktura folderów → .zip)": "bids",
}
TEXT_FILES = (".csv", ".tsv", ".json", ".md", "README")


def clean_label(s, default):
    """Etykiety BIDS: tylko litery i cyfry."""
    return re.sub(r"[^A-Za-z0-9]", "", s or "") or default


def unique_names(names, maxlen=None):
    out, seen = [], set()
    for i, n in enumerate(map(str, names)):
        n = n[:maxlen] if maxlen else n
        if n in seen:
            n = f"{n[:(maxlen or 99) - 4]}_{i}"
        seen.add(n)
        out.append(n)
    return out


def mne_bytes(data_uv, fs, names, fmt):
    """Zapis EDF / FIF przez MNE; zwraca bajty pliku."""
    try:
        import mne
        if fmt == "edf":
            import edfio  # noqa: F401
    except ImportError:
        raise RuntimeError("Ten format wymaga bibliotek mne i edfio: pip install mne edfio")
    info = mne.create_info(unique_names(names, 16 if fmt == "edf" else None), fs, "eeg")
    raw = mne.io.RawArray(data_uv.T * 1e-6, info, verbose=False)  # MNE: wolty
    with tempfile.TemporaryDirectory() as d:
        if fmt == "edf":
            path = Path(d) / "x.edf"
            mne.export.export_raw(path, raw, fmt="edf", overwrite=True, verbose=False)
        else:
            path = Path(d) / "x_raw.fif"
            raw.save(path, overwrite=True, verbose=False)
        return path.read_bytes()


def make_files(fmt, data, fs, names, bids, filt):
    """Zwraca słownik {ścieżka_względna: bajty}."""
    names = unique_names(names)
    if fmt == "csv":
        d = pd.DataFrame(data, columns=names)
        d.insert(0, "time_s", np.arange(len(data)) / fs)
        return {"vizja_eeg.csv": d.to_csv(index=False, float_format="%.4f").encode()}
    if fmt == "npz":
        b = io.BytesIO()
        np.savez(b, data_uV=data, fs=fs, ch_names=np.array(names))
        return {"vizja_eeg.npz": b.getvalue()}
    if fmt in ("edf", "fif"):
        return {f"vizja_eeg.{fmt}": mne_bytes(data, fs, names, fmt)}

    # ---- BIDS-EEG
    sub = clean_label(bids["sub"], "01")
    ses = clean_label(bids["ses"], "") if bids["ses"] else ""
    task = clean_label(bids["task"], "rest")
    base = f"sub-{sub}" + (f"/ses-{ses}" if ses else "")
    stem = f"sub-{sub}" + (f"_ses-{ses}" if ses else "") + f"_task-{task}"
    j = lambda o: json.dumps(o, indent=2, ensure_ascii=False).encode()

    sw = {}
    if filt["applied"]:
        if filt["hp"] or filt["lp"]:
            sw["Butterworth bandpass (4. rząd, zero-phase)"] = {
                "HighpassHz": filt["hp"] or "n/a", "LowpassHz": filt["lp"] or "n/a"}
        if filt["notch"]:
            sw["Notch"] = {"CenterHz": 50}
    na = lambda v: v if v else "n/a"
    ch_rows = ["name\ttype\tunits\tsampling_frequency\tlow_cutoff\thigh_cutoff\tnotch\tstatus"]
    for n in names:
        ch_rows.append("\t".join([n, "EEG", "uV", f"{fs:g}",
                                  str(na(filt["applied"] and filt["hp"])),
                                  str(na(filt["applied"] and filt["lp"])),
                                  "50" if filt["applied"] and filt["notch"] else "n/a", "good"]))
    eeg_json = {
        "TaskName": task, "SamplingFrequency": fs, "EEGReference": bids["ref"] or "n/a",
        "PowerLineFrequency": 50, "SoftwareFilters": sw or "n/a",
        "EEGChannelCount": len(names), "RecordingDuration": round(len(data) / fs, 3),
        "InstitutionName": "Uniwersytet Vizja",
    }
    return {
        "dataset_description.json": j({"Name": bids["name"] or "Vizja-EEG-Lab dataset",
                                       "BIDSVersion": "1.9.0", "DatasetType": "raw"}),
        "README": f"Zbiór wygenerowany w Vizja-EEG-Lab ({datetime.now():%Y-%m-%d}).\n".encode(),
        "participants.tsv": f"participant_id\nsub-{sub}\n".encode(),
        f"{base}/eeg/{stem}_eeg.edf": mne_bytes(data, fs, names, "edf"),
        f"{base}/eeg/{stem}_eeg.json": j(eeg_json),
        f"{base}/eeg/{stem}_channels.tsv": ("\n".join(ch_rows) + "\n").encode(),
    }


def tree_text(files):
    lines, shown = [], set()
    for path in sorted(files):
        parts = path.split("/")
        for d in range(len(parts) - 1):
            key = "/".join(parts[:d + 1])
            if key not in shown:
                shown.add(key)
                lines.append("  " * d + parts[d] + "/")
        lines.append("  " * (len(parts) - 1) + f"{parts[-1]}  ({len(files[path]) / 1024:.1f} KB)")
    return "\n".join(lines)


@st.cache_data(show_spinner="⏳ Przygotowanie podglądu eksportu…")
def build_export(fmt, data, fs, names, bids, filt):
    files = make_files(fmt, data, fs, names, bids, filt)
    if fmt == "bids":
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for pth, content in files.items():
                z.writestr(pth, content)
        return files, buf.getvalue()
    return files, next(iter(files.values()))


def dropdown(widget, *args, **kwargs):
    """Lista rozwijana bez możliwości wpisywania (filter_mode=None; starsze wersje – tylko CSS)."""
    try:
        return widget(*args, filter_mode=None, **kwargs)
    except TypeError:
        return widget(*args, **kwargs)


# ---------------------------------------------------------------- UI
# Układ „jedna strona”: zwarty CSS, sterowanie obok wykresów, wykresy skalowane do wysokości okna.
st.markdown("""<style>
.block-container{padding:2.3rem 1.2rem .3rem 1.2rem;max-width:100%}
[data-testid="stHeader"]{height:2rem;background:transparent}
[data-testid="stAppDeployButton"]{display:none}
[data-testid="stVerticalBlock"]{gap:.4rem}
[data-testid="stSidebarUserContent"]{padding:1.2rem 1rem .5rem 1rem}
[data-testid="stSidebar"] [data-testid="stVerticalBlock"]{gap:.3rem}
button[data-baseweb="tab"]{height:2rem;padding:0 .9rem}
div[data-testid="stImage"]{display:flex;justify-content:center}
div[data-testid="stImage"] img{max-height:calc(100vh - 215px);width:auto !important;
  max-width:100%;object-fit:contain}
[data-testid="stCaptionContainer"]{line-height:1.25}
[data-baseweb="select"] input{caret-color:transparent !important;pointer-events:none !important;user-select:none}
[data-baseweb="select"]{cursor:pointer}
</style>""", unsafe_allow_html=True)

# ---- miejsce na komunikaty o ładowaniu / błędach (u góry strony)
top = st.container()

# ---- panel boczny: dane i filtracja (tylko zbiera parametry)
with st.sidebar:
    st.markdown("**📂 Źródło danych**")
    source = st.radio("Źródło", ["Sygnał syntetyczny", "Własny plik"], horizontal=True,
                      label_visibility="collapsed")
    if source == "Sygnał syntetyczny":
        engines = ["NumPy (wbudowany)"] + (["NeuroKit2"] if nk is not None else [])
        engine = dropdown(st.selectbox, "Generator sygnału", engines,
                          help="Sposób tworzenia sygnału syntetycznego: własny kod NumPy lub "
                               "biblioteka NeuroKit2.")
        eyes_closed = st.toggle("Oczy zamknięte (silny rytm alfa)", True,
                                help="Przy zamkniętych oczach rytm alfa nad korą potyliczną "
                                     "(O1, O2) jest wyraźnie silniejszy.")
        art = dropdown(st.multiselect, "Artefakty (zakłócenia)",
                       ["Mruganie (Fp1)", "Sieć 50 Hz"], placeholder="Brak",
                       help="Dodaje typowe zakłócenia: mruganie powiekami (kanał Fp1) "
                            "i brum sieci energetycznej 50 Hz.")
        alpha_hz = st.slider("Częstotliwość rytmu alfa [Hz]", 8.0, 13.0, 10.0, 0.5,
                             help="Rytm alfa mieści się w pasmie 8–13 Hz; u dorosłych zwykle ok. 10 Hz.")
        noise_uv = st.slider("Poziom szumu tła [µV]", 1, 30, 10,
                             help="Amplituda szumu tła 1/f (aktywność niezwiązana z rytmami).")
        seed = st.number_input("Ziarno losowe (powtarzalność)", 0, 9999, 1,
                               help="Ta sama liczba daje ten sam sygnał. Zatwierdź klawiszem Enter.")
    else:
        up = st.file_uploader("Plik CSV / EDF", type=["csv", "edf"])
        fs_csv = st.number_input("Częstotliwość próbkowania Fs [Hz]", 1.0, 5000.0, 250.0,
                                 help="Dotyczy plików CSV (EDF zawiera tę informację). "
                                      "Zatwierdź klawiszem Enter.")

    st.markdown("**🎛️ Filtr pasmowy**")
    hp = st.slider("Dolna granica pasma – HP [Hz]", 0.0, 10.0, 0.5, 0.1,
                   help="Filtr górnoprzepustowy (HP): usuwa wolne dryfty linii podstawowej "
                        "(np. pot, ruchy). 0 = wyłączony.")
    lp = st.slider("Górna granica pasma – LP [Hz]", 0, 120, 45, 1,
                   help="Filtr dolnoprzepustowy (LP): tłumi szybkie zakłócenia (np. aktywność "
                        "mięśniowa). 0 = wyłączony; wartość ograniczana do połowy Fs.")
    notch = st.toggle("Filtr sieciowy 50 Hz (notch)", False,
                      help="Wycina wąskie pasmo wokół 50 Hz (zakłócenia z sieci energetycznej).")
    st.caption(f"Przepuszczane pasmo: {hp:g} – {lp if lp else '∞'} Hz"
               + (", bez 50 Hz" if notch else ""))

# ---- ładowanie danych (spinnery pokazują się u góry strony)
try:
    with top:
        if source == "Sygnał syntetyczny":
            fs = 250.0
            df = cached_synth(fs, 20, eyes_closed, "Mruganie (Fp1)" in art, "Sieć 50 Hz" in art,
                              "neurokit2" if engine == "NeuroKit2" else "numpy",
                              alpha_hz, float(noise_uv), int(seed))
        elif up is None:
            st.info("Wczytaj plik CSV (kolumny = kanały, µV) lub EDF w panelu bocznym.")
            st.stop()
        else:
            df, fs = cached_load(up.name, up.getvalue(), fs_csv)
            df = df.select_dtypes("number")
            if df.shape[1] == 0:
                raise RuntimeError("Plik nie zawiera kolumn numerycznych z kanałami EEG.")
except RuntimeError as e:
    top.error(str(e))
    st.stop()
except Exception as e:
    top.error(f"Nie udało się wczytać danych: {e}")
    st.stop()

lp_eff = min(lp, fs / 2 - 1) if lp else 0
if hp and lp_eff and hp >= lp_eff:
    top.warning("Dolna granica pasma (HP) musi być mniejsza niż górna (LP).")
    st.stop()

# ---- nagłówek: logo, tytuł, wybór kanału
logo_html = ""
if LOGO is not None:
    try:
        _b = io.BytesIO()
        LOGO.convert("RGBA").save(_b, "PNG")
        logo_html = ('<img src="data:image/png;base64,' + base64.b64encode(_b.getvalue()).decode()
                     + '" style="height:46px">')
    except Exception:
        logo_html = ""
h_logo, h_title, h_ch = st.columns([0.7, 6, 2.3], vertical_alignment="center")
h_logo.markdown(logo_html, unsafe_allow_html=True)
h_title.markdown(
    '<div style="line-height:1.15"><span style="font-size:1.6rem;font-weight:700">'
    + ("" if LOGO is not None else "🧠 ") + 'Vizja-EEG-Lab</span><br>'
    '<span style="opacity:.65;font-size:.85rem">Dydaktyczna aplikacja do wizualizacji i analizy '
    'sygnału EEG – Uniwersytet Vizja</span></div>', unsafe_allow_html=True)
channel = dropdown(h_ch.selectbox, "Kanał do analizy (widmo, pasma, spektrogram)", list(df.columns))

x_raw = df.to_numpy(float)
with top:
    x = preprocess(x_raw, fs, float(hp), float(lp), bool(notch))
t = np.arange(len(x)) / fs
ci = list(df.columns).index(channel)

tab1, tab2, tab3, tab4, tab5 = st.tabs(["Sygnał", "Widmo (PSD)", "Pasma EEG", "Spektrogram", "Eksport"])

# ---- 1. sygnał w czasie
with tab1:
    L, R = st.columns([1, 5])
    with L:
        wmax = max(2, int(min(30, t[-1])))
        dur_win = st.slider("Długość okna [s]", 1, wmax, min(10, wmax), help="Ile sekund sygnału pokazać na wykresie.")
        start = st.slider("Początek okna [s]", 0.0, float(max(t[-1] - dur_win, 0.1)), 0.0, 0.5,
                          help="Od którego momentu nagrania zaczyna się okno.")
        show_raw = st.checkbox("Nałóż sygnał przed filtracją (szary)", False)
        st.caption("Sygnał w dziedzinie czasu. Rytm alfa jest najsilniejszy w odprowadzeniach "
                   "potylicznych (O1, O2); mruganie widać w Fp1, sieć jako drobne drgania 50 Hz.")
    m = (t >= start) & (t < start + dur_win)
    spread = np.percentile(np.abs(x[m]), 99) * 2.2
    fig, ax = plt.subplots(figsize=(11, 4.6))
    for i, ch in enumerate(df.columns):
        off = -i * spread
        if show_raw:
            ax.plot(t[m], x_raw[m, i] - x_raw[m, i].mean() + off, c="lightgray", lw=0.7)
        ax.plot(t[m], x[m, i] + off, lw=0.8, c="k")
    ax.set_yticks([-i * spread for i in range(len(df.columns))])
    ax.set_yticklabels(df.columns)
    ax.set_xlabel("Czas [s]")
    ax.set_title(f"EEG, skala: ±{spread / 2.2:.0f} µV na kanał")
    R.pyplot(fig)

# ---- 2. widmo PSD
with tab2:
    L, R = st.columns([1, 5])
    with L:
        fmax_psd = st.slider("Oś częstotliwości do [Hz]", 20, int(max(21, min(100, fs / 2))), 60,
                             help="Maksymalna częstotliwość widoczna na wykresie.")
        logy = st.toggle("Skala logarytmiczna osi mocy", True,
                         help="Skala log ułatwia porównanie słabych i silnych składowych widma.")
        st.caption("Widmo mocy (metoda Welcha): jakie częstotliwości dominują w sygnale. "
                   "Szczyt ok. 10 Hz = rytm alfa; pik 50 Hz = zakłócenie sieciowe.")
    f, p, _ = band_powers(x[:, ci], fs)
    fig, ax = plt.subplots(figsize=(11, 4.6))
    for (name, (lo, hi)), c in zip(BANDS.items(), COLORS):
        ax.axvspan(lo, hi, color=c, alpha=0.2, label=name)
    (ax.semilogy if logy else ax.plot)(f, p, c="k")
    ax.set_xlim(0, fmax_psd)
    ax.set_xlabel("Częstotliwość [Hz]")
    ax.set_ylabel("PSD [µV²/Hz]")
    ax.set_title(f"Kanał {channel}")
    ax.legend(ncol=5, fontsize=8, loc="upper right")
    R.pyplot(fig)

# ---- 3. moc w pasmach
with tab3:
    rows = {}
    for i, ch in enumerate(df.columns):
        _, _, ab = band_powers(x[:, i], fs)
        tot = sum(ab.values())
        rows[ch] = {k: 100 * v / tot for k, v in ab.items()}
    rel = pd.DataFrame(rows).T
    L, M, R = st.columns([1.1, 2, 2.4])
    with L:
        tb = rel.iloc[:, 1] / rel.iloc[:, 3]
        st.metric(f"Theta/Beta ({channel})", f"{tb[channel]:.2f}")
        st.caption("Moc względna = udział mocy pasma w całkowitej mocy 0,5–45 Hz. Stosunek "
                   "theta/beta bywa wykorzystywany jako wskaźnik w badaniach nad uwagą.")
    with M:
        fig, ax = plt.subplots(figsize=(5, 4))
        ax.bar([k.split(" ")[0] for k in BANDS], rel.loc[channel], color=COLORS)
        ax.set_ylabel("Moc względna [%]")
        ax.set_title(f"Kanał {channel}")
        st.pyplot(fig)
    with R:
        st.caption("Moc względna pasm [%] we wszystkich kanałach")
        st.dataframe(rel.round(1).rename(columns=lambda c: c.split(" ")[0]),
                     height=min(35 * (len(rel) + 1) + 3, 330))

# ---- 4. spektrogram
with tab4:
    L, R = st.columns([1, 5])
    with L:
        fmax = st.slider("Oś częstotliwości do [Hz]", 20, int(max(21, min(60, fs / 2))), 45,
                         key="fmax_spec", help="Maksymalna częstotliwość widoczna na wykresie.")
        st.caption("Zmiany widma w czasie (jasność = moc). Włącz mruganie lub przełącz stan oczu "
                   "w danych syntetycznych i zobacz, jak zmienia się obraz.")
    f, tt, S = signal.spectrogram(x[:, ci], fs, nperseg=int(fs), noverlap=int(fs * 0.9))
    k = f <= fmax
    fig, ax = plt.subplots(figsize=(11, 4.6))
    im = ax.pcolormesh(tt, f[k], 10 * np.log10(S[k] + 1e-12), shading="auto", cmap="viridis")
    ax.set_xlabel("Czas [s]")
    ax.set_ylabel("Częstotliwość [Hz]")
    ax.set_title(f"Kanał {channel}")
    fig.colorbar(im, label="Moc [dB]")
    R.pyplot(fig)

# ---- 5. eksport (podgląd odświeża się automatycznie po każdej zmianie ustawień)
with tab5:
    A, B, C = st.columns([1.15, 1.5, 1.6])
    cols = list(df.columns)
    ex = None
    with A:
        which = st.radio("Dane do zapisu", ["Przefiltrowane", "Surowe"], horizontal=True,
                         help="Przefiltrowane = po filtrze pasmowym ustawionym w panelu bocznym.")
        chans = dropdown(st.multiselect, "Kanały do zapisu", cols, default=cols)
        t0, t1 = st.slider("Zakres czasu [s]", 0.0, float(t[-1]), (0.0, float(t[-1])), 0.1)
        fmt_label = dropdown(st.selectbox, "Format pliku", list(FORMATS))
        fmt = FORMATS[fmt_label]
        b_name, b_sub, b_ses, b_task, b_ref = "Vizja-EEG-Lab dataset", "01", "", "rest", "n/a"
        if fmt == "bids":
            with st.expander("Parametry BIDS", expanded=True):
                b1, b2 = st.columns(2)
                b_sub = b1.text_input("Osoba (sub-)", b_sub, help="Identyfikator badanego, np. 01.")
                b_ses = b2.text_input("Sesja (ses-)", b_ses, help="Opcjonalnie, np. 01.")
                b_task = b1.text_input("Zadanie (task-)", b_task, help="np. rest, eyesclosed.")
                b_ref = b2.text_input("Referencja", b_ref, help="Elektroda referencyjna, np. Cz.")
                b_name = st.text_input("Nazwa zbioru danych", b_name)

        if not chans:
            st.warning("Wybierz co najmniej jeden kanał.")
        elif t1 - t0 < 1 / fs:
            st.warning("Zakres czasu jest za krótki.")
        else:
            m = (t >= t0) & (t <= t1)
            idx = [cols.index(c) for c in chans]
            data = np.ascontiguousarray((x if which == "Przefiltrowane" else x_raw)[m][:, idx])
            filt = {"applied": which == "Przefiltrowane", "hp": hp, "lp": lp, "notch": notch}
            bids = {"name": b_name, "sub": b_sub, "ses": b_ses, "task": b_task, "ref": b_ref}
            try:
                files, payload = build_export(fmt, data, fs, chans, bids, filt)
                ex = dict(files=files, payload=payload, data=data, names=chans, fs=fs)
            except RuntimeError as e:
                st.error(str(e))
        st.download_button(
            "💾 Zapisz plik" if fmt != "bids" else "💾 Zapisz (BIDS .zip)",
            ex["payload"] if ex else b"",
            ("vizja_bids.zip" if fmt == "bids" else f"vizja_eeg.{fmt}"),
            "application/zip" if fmt == "bids" else "application/octet-stream",
            disabled=ex is None, type="primary", use_container_width=True)

    if ex:
        n, nch = len(ex["data"]), len(ex["names"])
        with B:
            st.caption(f"Podgląd: **{nch}** kanałów × **{n}** próbek · Fs {ex['fs']:g} Hz · "
                       f"{n / ex['fs']:.1f} s · plik: **{len(ex['payload']) / 1024:.1f} KB**")
            with st.container(height=190):
                st.code(tree_text(ex["files"]), language="text")
            chosen = dropdown(st.selectbox, "Podgląd zawartości pliku", sorted(ex["files"]))
            content = ex["files"][chosen]
            if chosen.endswith(TEXT_FILES):
                text = content.decode("utf-8", errors="replace").splitlines()
                with st.container(height=170):
                    st.code("\n".join(text[:20]) + ("\n..." if len(text) > 20 else ""))
            else:
                st.caption("Plik binarny – zapisywane dane widoczne w tabeli i na wykresie obok.")
        with C:
            prev = pd.DataFrame(ex["data"][:4], columns=unique_names(ex["names"]))
            prev.insert(0, "t [s]", np.arange(len(prev)) / ex["fs"])
            st.caption("Pierwsze próbki [µV]")
            st.dataframe(prev.round(2), hide_index=True, height=178)
            k = min(n, int(10 * ex["fs"]))
            seg, tt = ex["data"][:k], np.arange(k) / ex["fs"]
            sp = np.percentile(np.abs(seg), 99) * 2.2 or 1
            fig, ax = plt.subplots(figsize=(5.4, 2.6))
            for i, c in enumerate(ex["names"]):
                ax.plot(tt, seg[:, i] - i * sp, lw=0.6, c="k")
            ax.set_yticks([-i * sp for i in range(nch)])
            ax.set_yticklabels(ex["names"])
            ax.set_xlabel("Czas [s]")
            ax.set_title("Podgląd zapisywanego sygnału (pierwsze 10 s)")
            st.pyplot(fig)
    else:
        B.info("Podgląd pojawi się automatycznie po wybraniu kanałów i formatu.")
