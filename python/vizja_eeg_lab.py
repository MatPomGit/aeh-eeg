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

    # mne + edfio (odczyt/zapis EDF, FIF, BIDS) – opcjonalne; jedna próba instalacji
    marker = vdir / ".mne_failed"
    if run("-c", "import mne, edfio", capture_output=True).returncode and not marker.exists():
        print("► Instalacja mne + edfio (obsługa EDF/FIF/BIDS)...")
        if run("-m", "pip", "install", "mne", "edfio").returncode:
            marker.touch()
            print("  Pominięto mne/edfio – EDF, FIF i BIDS niedostępne, CSV i NPZ działają normalnie.")

    print("► Uruchamianie Vizja-EEG-Lab...")
    env = {**os.environ, "VIZJA_BOOT": "1"}
    try:
        sys.exit(run("-m", "streamlit", "run", str(Path(__file__).resolve()), env=env).returncode)
    except KeyboardInterrupt:
        sys.exit(0)


if os.environ.get("VIZJA_BOOT") != "1":
    bootstrap()

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


def synth_eeg(fs, dur, eyes_closed, blinks, mains):
    """Sygnał syntetyczny: szum 1/f + rytmy + opcjonalne artefakty."""
    rng = np.random.default_rng(1)
    t = np.arange(0, dur, 1 / fs)
    chans = ["Fp1", "Cz", "O1", "O2"]
    alpha_amp = {"Fp1": 3, "Cz": 5, "O1": 15, "O2": 15} if eyes_closed else \
                {"Fp1": 2, "Cz": 2, "O1": 3, "O2": 3}
    data = []
    for ch in chans:
        x = pink_noise(len(t), rng, 10)
        x += alpha_amp[ch] * np.sin(2 * np.pi * 10 * t + rng.uniform(0, 6)) \
            * (1 + 0.3 * np.sin(2 * np.pi * 0.2 * t))
        x += 2 * np.sin(2 * np.pi * 6 * t + rng.uniform(0, 6))     # theta
        x += 1.5 * np.sin(2 * np.pi * 20 * t + rng.uniform(0, 6))  # beta
        if blinks and ch == "Fp1":
            for tb in np.arange(2, dur, 4):
                x += 100 * np.exp(-((t - tb) ** 2) / (2 * 0.08 ** 2))
        if mains:
            x += 8 * np.sin(2 * np.pi * 50 * t)
        data.append(x)
    return pd.DataFrame(np.array(data).T, columns=chans)


def load_file(f, fs_csv):
    if f.name.lower().endswith(".edf"):
        try:
            import mne
        except ImportError:
            st.error("Do odczytu EDF zainstaluj bibliotekę: pip install mne")
            st.stop()
        with tempfile.NamedTemporaryFile(suffix=".edf", delete=False) as tmp:
            tmp.write(f.read())
        raw = mne.io.read_raw_edf(tmp.name, preload=True, verbose=False)
        return pd.DataFrame(raw.get_data().T * 1e6, columns=raw.ch_names), raw.info["sfreq"]
    return pd.read_csv(f), fs_csv


# ---------------------------------------------------------------- filtry
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


# ---------------------------------------------------------------- UI
if LOGO is not None:
    h1, h2 = st.columns([1, 6], vertical_alignment="center")
    h1.image(LOGO, width=110)
    h2.title("Vizja-EEG-Lab")
else:
    st.title("🧠 Vizja-EEG-Lab")
st.caption("Dydaktyczna aplikacja do wizualizacji i analizy sygnału EEG – Uniwersytet Vizja")

with st.sidebar:
    st.header("Dane")
    source = st.radio("Źródło", ["Sygnał syntetyczny", "Własny plik (CSV / EDF)"])
    if source == "Sygnał syntetyczny":
        fs = 250.0
        eyes_closed = st.toggle("Oczy zamknięte (rytm alfa)", True)
        blinks = st.toggle("Artefakt: mruganie (Fp1)", False)
        mains = st.toggle("Artefakt: sieć 50 Hz", False)
        df = synth_eeg(fs, 20, eyes_closed, blinks, mains)
    else:
        up = st.file_uploader("Wczytaj plik", type=["csv", "edf"])
        fs_csv = st.number_input("Fs [Hz] (dla CSV)", 1.0, 5000.0, 250.0)
        if up is None:
            st.info("CSV: kolumny = kanały, wiersze = próbki, jednostka µV.")
            st.stop()
        df, fs = load_file(up, fs_csv)
        df = df.select_dtypes("number")

    st.header("Filtracja")
    hp = st.number_input("Górnoprzepustowy [Hz] (0 = wył.)", 0.0, 50.0, 0.5)
    lp = st.number_input("Dolnoprzepustowy [Hz] (0 = wył.)", 0.0, 200.0, 45.0)
    notch = st.toggle("Filtr notch 50 Hz", False)

    st.header("Kanał do analizy")
    channel = st.selectbox("Kanał", list(df.columns))

x_raw = df.to_numpy(float)
x = preprocess(x_raw, fs, hp, lp, notch)
t = np.arange(len(x)) / fs
ci = list(df.columns).index(channel)

tab1, tab2, tab3, tab4, tab5 = st.tabs(["Sygnał", "Widmo (PSD)", "Pasma EEG", "Spektrogram", "Eksport"])

with tab1:
    st.info("Sygnał w dziedzinie czasu. Porównaj przebieg surowy i przefiltrowany; "
            "zwróć uwagę na rytm alfa w odprowadzeniach potylicznych (O1, O2) "
            "oraz artefakty (mruganie – wysoka amplituda w Fp1, sieć – 50 Hz).")
    dur_win = st.slider("Długość okna [s]", 1, int(min(30, t[-1])), min(10, int(t[-1])))
    start = st.slider("Początek okna [s]", 0.0, float(max(t[-1] - dur_win, 0.1)), 0.0, 0.5)
    show_raw = st.checkbox("Nałóż sygnał surowy (szary)", False)
    m = (t >= start) & (t < start + dur_win)
    spread = np.percentile(np.abs(x[m]), 99) * 2.2
    fig, ax = plt.subplots(figsize=(11, 5))
    for i, ch in enumerate(df.columns):
        off = -i * spread
        if show_raw:
            ax.plot(t[m], x_raw[m, i] - x_raw[m, i].mean() + off, c="lightgray", lw=0.7)
        ax.plot(t[m], x[m, i] + off, lw=0.8, c="k")
    ax.set_yticks([-i * spread for i in range(len(df.columns))])
    ax.set_yticklabels(df.columns)
    ax.set_xlabel("Czas [s]")
    ax.set_title(f"EEG, skala: ±{spread / 2.2:.0f} µV na kanał")
    st.pyplot(fig)

with tab2:
    st.info("Widmo mocy (metoda Welcha) pokazuje, jakie częstotliwości dominują w sygnale. "
            "Szczyt ok. 10 Hz = rytm alfa; pik 50 Hz = zakłócenie sieciowe.")
    f, p, _ = band_powers(x[:, ci], fs)
    fig, ax = plt.subplots(figsize=(11, 4))
    for (name, (lo, hi)), c in zip(BANDS.items(), COLORS):
        ax.axvspan(lo, hi, color=c, alpha=0.2, label=name)
    ax.semilogy(f, p, c="k")
    ax.set_xlim(0, 60)
    ax.set_xlabel("Częstotliwość [Hz]")
    ax.set_ylabel("PSD [µV²/Hz]")
    ax.set_title(f"Kanał {channel}")
    ax.legend(ncol=5, fontsize=8, loc="upper right")
    st.pyplot(fig)

with tab3:
    st.info("Moc względna pasm = udział mocy danego pasma w całkowitej mocy 0,5–45 Hz. "
            "Stosunek theta/beta bywa wykorzystywany jako wskaźnik w badaniach nad uwagą.")
    rows = {}
    for i, ch in enumerate(df.columns):
        _, _, ab = band_powers(x[:, i], fs)
        tot = sum(ab.values())
        rows[ch] = {k: 100 * v / tot for k, v in ab.items()}
    rel = pd.DataFrame(rows).T
    c1, c2 = st.columns([1, 1])
    with c1:
        fig, ax = plt.subplots(figsize=(5, 4))
        ax.bar([k.split(" ")[0] for k in BANDS], rel.loc[channel], color=COLORS)
        ax.set_ylabel("Moc względna [%]")
        ax.set_title(f"Kanał {channel}")
        st.pyplot(fig)
    with c2:
        st.dataframe(rel.round(1).style.format("{:.1f}"))
        tb = rel.iloc[:, 1] / rel.iloc[:, 3]
        st.metric(f"Theta/Beta ({channel})", f"{tb[channel]:.2f}")

with tab4:
    st.info("Spektrogram pokazuje zmiany widma w czasie (jasność = moc). "
            "Spróbuj włączyć mruganie lub przełączyć stan oczu w danych syntetycznych.")
    fmax = st.slider("Maks. częstotliwość [Hz]", 20, 60, 45)
    f, tt, S = signal.spectrogram(x[:, ci], fs, nperseg=int(fs), noverlap=int(fs * 0.9))
    k = f <= fmax
    fig, ax = plt.subplots(figsize=(11, 4))
    im = ax.pcolormesh(tt, f[k], 10 * np.log10(S[k] + 1e-12), shading="auto", cmap="viridis")
    ax.set_xlabel("Czas [s]")
    ax.set_ylabel("Częstotliwość [Hz]")
    fig.colorbar(im, label="Moc [dB]")
    st.pyplot(fig)


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
        st.error("Ten format wymaga bibliotek mne i edfio: pip install mne edfio "
                 "(w .venv: .venv/bin/pip install mne edfio)")
        st.stop()
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


with tab5:
    st.info("Kolejność: **1)** ustaw parametry → **2)** wygeneruj podgląd → **3)** pobierz plik. "
            "Wszystkie dane zapisywane są w µV.")
    with st.form("export_form"):
        c1, c2 = st.columns(2)
        with c1:
            which = st.radio("Dane", ["Przefiltrowane", "Surowe"], horizontal=True)
            chans = st.multiselect("Kanały", list(df.columns), default=list(df.columns))
            t0, t1 = st.slider("Zakres czasu [s]", 0.0, float(t[-1]), (0.0, float(t[-1])), 0.1)
            fmt_label = st.selectbox("Format", list(FORMATS))
        with c2:
            st.caption("Parametry BIDS (używane tylko dla formatu BIDS)")
            b_name = st.text_input("Nazwa zbioru danych", "Vizja-EEG-Lab dataset")
            b_sub = st.text_input("Identyfikator osoby (sub-)", "01")
            b_ses = st.text_input("Sesja (ses-, opcjonalnie)", "")
            b_task = st.text_input("Zadanie (task-)", "rest")
            b_ref = st.text_input("Elektroda referencyjna", "n/a")
        go = st.form_submit_button("Generuj podgląd", type="primary")

    if go:
        if not chans:
            st.error("Wybierz co najmniej jeden kanał.")
        elif t1 - t0 < 1 / fs:
            st.error("Zakres czasu jest za krótki.")
        else:
            m = (t >= t0) & (t <= t1)
            idx = [list(df.columns).index(c) for c in chans]
            src = x if which == "Przefiltrowane" else x_raw
            data = np.ascontiguousarray(src[m][:, idx])
            fmt = FORMATS[fmt_label]
            filt = {"applied": which == "Przefiltrowane", "hp": hp, "lp": lp, "notch": notch}
            bids = {"name": b_name, "sub": b_sub, "ses": b_ses, "task": b_task, "ref": b_ref}
            with st.spinner("Generowanie plików..."):
                files = make_files(fmt, data, fs, chans, bids, filt)
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if fmt == "bids":
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
                    for pth, content in files.items():
                        z.writestr(pth, content)
                payload, dl_name, mime = buf.getvalue(), f"vizja_bids_{stamp}.zip", "application/zip"
            else:
                (pth, payload), = files.items()
                dl_name, mime = f"vizja_eeg_{stamp}.{fmt}", "application/octet-stream"
            st.session_state["export"] = dict(
                files=files, data=data, fs=fs, names=chans, payload=payload,
                dl_name=dl_name, mime=mime, fmt=fmt)

    ex = st.session_state.get("export")
    if ex:
        st.subheader("Podgląd przed zapisem")
        n, nch = len(ex["data"]), len(ex["names"])
        st.write(f"**{nch}** kanałów × **{n}** próbek, Fs = {ex['fs']:g} Hz, "
                 f"czas = {n / ex['fs']:.1f} s, rozmiar pobieranego pliku: "
                 f"**{len(ex['payload']) / 1024:.1f} KB**")
        pc1, pc2 = st.columns([1, 1])
        with pc1:
            st.caption("Zawartość (struktura plików)")
            st.code(tree_text(ex["files"]), language="text")
            chosen = st.selectbox("Podejrzyj plik", sorted(ex["files"]))
            content = ex["files"][chosen]
            if chosen.endswith(TEXT_FILES):
                text = content.decode("utf-8", errors="replace").splitlines()
                st.code("\n".join(text[:15]) + ("\n..." if len(text) > 15 else ""))
            else:
                st.caption("Plik binarny – poniżej pierwsze próbki zapisywanych danych.")
        with pc2:
            prev = pd.DataFrame(ex["data"][:8], columns=unique_names(ex["names"]))
            prev.insert(0, "t [s]", np.arange(len(prev)) / ex["fs"])
            st.caption("Pierwsze próbki [µV]")
            st.dataframe(prev.round(2), hide_index=True)
        k = min(len(ex["data"]), int(10 * ex["fs"]))
        seg, tt = ex["data"][:k], np.arange(k) / ex["fs"]
        sp = np.percentile(np.abs(seg), 99) * 2.2 or 1
        fig, ax = plt.subplots(figsize=(11, 3 + 0.3 * nch))
        for i, c in enumerate(ex["names"]):
            ax.plot(tt, seg[:, i] - i * sp, lw=0.7, c="k")
        ax.set_yticks([-i * sp for i in range(nch)])
        ax.set_yticklabels(ex["names"])
        ax.set_xlabel("Czas [s]")
        ax.set_title("Podgląd zapisywanego sygnału (pierwsze 10 s)")
        st.pyplot(fig)
        st.download_button("💾 Zapisz / pobierz", ex["payload"], ex["dl_name"], ex["mime"],
                           type="primary")
