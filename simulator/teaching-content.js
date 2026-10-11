const $=(s,r=document)=>r.querySelector(s);

function removeLegacyIntro(){
 const intro=$('#m5 .teaching-intro');
 if(intro)intro.remove();
}

/*
 * Warstwa dydaktyczna.
 *
 * Zasada: nie modyfikuje istniejących elementów modułów. Każdy opis jest
 * dopisywany na końcu odpowiedniego ekranu, dzięki czemu symulacje,
 * wykresy i dotychczasowe objaśnienia pozostają bez zmian.
 */
const LESSONS={
 m1x:{
  title:'Jak interpretować surowy sygnał EEG?',
  intro:'Elektrody mierzą różnice potencjałów na skórze głowy. Sygnał odzwierciedla głównie sumowanie aktywności postsynaptycznej populacji neuronów oraz artefakty.',
  observe:['Porównaj amplitudę i rytmiczność sygnału między kanałami, zamiast oceniać pojedynczą próbkę.','Zwróć uwagę, że prawidłowy EEG jest zmienny w czasie i nie przypomina idealnej sinusoidy.','Szukaj zmian powtarzalnych i zależnych od stanu osoby badanej, np. otwarcia lub zamknięcia oczu.'],
  trap:'Duża amplituda nie oznacza automatycznie silniejszej aktywności mózgu. Może wynikać z EOG, EMG, ruchu elektrody albo nieprawidłowej referencji.',
  task:'Wskaż fragment, którego nie dałoby się wiarygodnie zinterpretować bez informacji o artefaktach i stanie osoby badanej. Uzasadnij dlaczego.'
 },
 mfft:{
  title:'Od przebiegu w czasie do widma',
  intro:'FFT rozkłada fragment EEG na składowe częstotliwościowe. Rozdzielczość widma wynosi około 1/T, gdzie T oznacza długość analizowanego odcinka.',
  observe:['Sprawdź, gdzie występują lokalne maksima mocy i czy odpowiadają rytmom widocznym w przebiegu czasowym.','Porównuj zakresy częstotliwości na odcinkach o tej samej długości.','Pamiętaj, że rozdzielczość częstotliwościowa zależy od długości analizowanego okna.'],
  trap:'Pojedynczy pik w FFT nie jest dowodem na obecność określonego stanu psychicznego ani zaburzenia.',
  task:'Zmień charakter sygnału i przewidź przed spojrzeniem na FFT, w jakiej części widma powinna wzrosnąć moc.'
 },
 mlobes:{
  title:'Topografia nie jest lokalizacją źródła',
  intro:'Położenie elektrody nie wyznacza jednoznacznie źródła sygnału. Przewodzenie objętościowe sprawia, że jeden kanał zawiera wkład wielu obszarów mózgu.',
  observe:['Łącz topografię z funkcją ostrożnie i zawsze uwzględniaj rozchodzenie się pola elektrycznego.','Traktuj związki „płat–funkcja–pasmo” jako heurystykę dydaktyczną, a nie mapę jeden-do-jednego.','Porównuj wzorce przestrzenne wielu kanałów zamiast pojedynczej elektrody.'],
  trap:'Błąd odwrotny EEG jest niedookreślony: ten sam rozkład potencjałów na skórze może być zgodny z wieloma konfiguracjami źródeł.',
  task:'Wybierz jedną funkcję poznawczą i wyjaśnij, dlaczego nie należy przypisywać jej do pojedynczej elektrody.'
 },
 m2x:{
  title:'Montaż decyduje o tym, co widzisz',
  intro:'Kanał EEG przedstawia różnicę potencjałów między elektrodami. Zmiana referencji zmienia amplitudę i kształt zapisu bez zmiany aktywności mózgu.',
  observe:['Sprawdź, które kanały dzielą wspólną referencję.','Oceń, czy rozmieszczenie elektrod pozwala odpowiedzieć na pytanie badawcze.','Rozróżniaj pozycję elektrody, nazwę kanału i sposób referencjonowania.'],
  trap:'„Cisza” w jednym kanale nie oznacza braku aktywności — może wynikać z podobnego potencjału na obu wejściach wzmacniacza.',
  task:'Wyjaśnij, co zmieni się w zapisie po zmianie referencji i co pozostanie niezmienione fizjologicznie.'
 },
 msimlive2:{
  title:'Artefakt jest częścią rzeczywistego pomiaru',
  intro:'Mruganie generuje artefakty EOG, a napięcie mięśni artefakty EMG. Oba sygnały nakładają się na EEG już podczas rejestracji.',
  observe:['Zamknij oczy i porównaj kanał potyliczny z czołowymi.','Mrugnij kilka razy i sprawdź, gdzie efekt EOG jest największy.','Poruszaj żuchwą lub napnij mięśnie twarzy i obserwuj szerokopasmowy charakter EMG.'],
  trap:'Automatyczne usuwanie wszystkiego, co ma dużą amplitudę, może usuwać także użyteczny sygnał neuronalny.',
  task:'Wykonaj trzy krótkie próby: oczy otwarte, oczy zamknięte i napięta żuchwa. Opisz, po czym rozpoznajesz każdy stan w EEG.'
 },
 mphys2:{
  title:'Różne sygnały — różne skale czasu',
  intro:'EKG rejestruje aktywność elektryczną serca, EMG mięśni, a EDA zmiany przewodnictwa skóry związane z aktywnością gruczołów potowych. Sygnały różnią się czasem reakcji.',
  observe:['EKG reaguje w rytmie kolejnych cykli pracy serca.','EDA ma wolniejszą odpowiedź i zwykle nie zmienia się natychmiast po bodźcu.','EMG może zmieniać się bardzo szybko i ma szerokie widmo częstotliwości.'],
  trap:'Nie porównuj bezpośrednio amplitud sygnałów wyrażonych w różnych jednostkach i pochodzących z różnych torów pomiarowych.',
  task:'Dla nagłego bodźca zapisz oczekiwaną kolejność zmian EMG, EKG i EDA oraz uzasadnij ją fizjologicznie.'
 },
 meye2:{
  title:'Eye tracking mierzy zachowanie wzrokowe, nie uwagę wprost',
  intro:'Eye tracking mierzy położenie spojrzenia, fiksacje i sakkady. Fiksacja wskazuje miejsce patrzenia, ale nie dowodzi świadomego przetwarzania treści.',
  observe:['Odróżnij fiksacje od sakkad i zwróć uwagę na kolejność odwiedzania obszarów.','Porównaj pojedynczą ścieżkę wzroku z mapą zagregowaną — odpowiadają na inne pytania.','Zwróć uwagę na znaczenie kalibracji i geometrii kamery.'],
  trap:'Heatmapa bez informacji o czasie, kolejności i obszarach zainteresowania może prowadzić do nadinterpretacji.',
  task:'Zbuduj dwie różne ścieżki prowadzące do podobnej heatmapy i wyjaśnij, jaką informację traci agregacja.'
 },
 m3:{
  title:'Oddball: od zdarzenia do odpowiedzi wywołanej',
  intro:'W oddball rzadkie bodźce docelowe występują wśród częstych standardowych. Znaczniki czasu pozwalają wyrównać epoki EEG i obliczyć ERP.',
  observe:['Porównaj odpowiedzi po S1 i S2, zwracając uwagę na opóźnienie komponentów względem znacznika.','Sprawdź, że pojedyncza odpowiedź jest zaszumiona i nie musi przypominać średniego ERP.','Obserwuj, że P3 jest zjawiskiem czasowo związanym ze zdarzeniem, a nie stałą falą EEG.'],
  trap:'Komponent ERP nie powinien być identyfikowany wyłącznie po jednym lokalnym maksimum w pojedynczej próbie.',
  task:'Wyjaśnij, dlaczego błąd synchronizacji znacznika bodźca o kilkadziesiąt milisekund pogarsza uśredniony ERP.'
 },
 mstroop:{
  title:'Efekt Stroopa jako miara interferencji',
  intro:'Efekt Stroopa to zwykle dłuższy czas reakcji przy niezgodności koloru czcionki i znaczenia słowa. Interferencję oblicza się jako różnicę między warunkami.',
  observe:['Porównuj próby zgodne i niezgodne u tej samej osoby.','Uwzględniaj zarówno czas reakcji, jak i poprawność.','Zbierz wystarczającą liczbę prób przed interpretacją średniej.'],
  trap:'Pojedynczy wolny wynik nie świadczy o deficycie kontroli poznawczej — wpływają na niego m.in. losowa zmienność, strategia i opóźnienie reakcji.',
  task:'Wykonaj serię prób i sprawdź, czy efekt interferencji pozostaje podobny po zwiększeniu liczby obserwacji.'
 },
 m5:{
  title:'Preprocessing jest częścią analizy, a nie kosmetyką',
  intro:'Preprocessing obejmuje kontrolę kanałów, filtrowanie, referencjonowanie i ocenę artefaktów. Każdy krok może zmienić amplitudę, fazę lub widmo EEG.',
  observe:['Kontroluj dane przed i po każdym kroku zamiast stosować cały pipeline „w ciemno”.','Parametry filtrów powinny wynikać z rodzaju analizy i charakterystyki rejestracji.','Zapisuj kolejność oraz parametry operacji, aby analiza była reprodukowalna.'],
  trap:'Bardziej „gładki” sygnał nie musi być sygnałem bardziej prawdziwym.',
  task:'Dla każdej zastosowanej operacji dopisz jedno zdanie: jaki problem usuwa i jaki użyteczny sygnał może przypadkowo zmienić.'
 },
 mica:{
  title:'ICA rozdziela mieszaniny statystycznie, nie anatomicznie',
  intro:'ICA rozdziela EEG na komponenty statystycznie niezależne. Artefakty identyfikuje się na podstawie topografii, przebiegu czasowego i widma komponentu.',
  observe:['Szukaj zgodności kilku cech komponentu, np. topografii czołowej, dużych wolnych defleksji i związku z mrugnięciem.','Porównuj dane przed i po rekonstrukcji.','Usuwaj możliwie mało komponentów i dokumentuj kryteria.'],
  trap:'Etykieta automatycznego klasyfikatora komponentów jest podpowiedzią, a nie dowodem.',
  task:'Wybierz komponent artefaktowy i podaj co najmniej dwa niezależne argumenty uzasadniające jego odrzucenie.'
 },
 mpostx:{
  title:'Uśrednianie zmniejsza szum, ale nie tworzy informacji',
  intro:'Uśrednianie epok wzmacnia składnik powtarzalny względem nieskorelowanego szumu. Przy spełnieniu założeń amplituda szumu średniej maleje około 1/√N.',
  observe:['Zwiększ liczbę prób i śledź stabilizację kształtu ERP lub PSD.','Porównaj zmniejszanie wariancji z zachowaniem sygnału powtarzalnego.','Sprawdź, czy wynik nie jest zdominowany przez kilka odstających prób.'],
  trap:'Duże N nie naprawia systematycznego błędu, np. złych znaczników zdarzeń albo błędnego filtra.',
  task:'Porównaj wynik dla małej i dużej liczby segmentów. Opisz, co się stabilizuje, a co pozostaje niezmienne.'
 },
 mqeeg:{
  title:'qEEG: liczby wymagają kontekstu',
  intro:'qEEG opisuje zapis liczbowo, m.in. mocą bezwzględną i względną pasm. Wyniki zależą od referencji, filtracji, artefaktów i warunków rejestracji.',
  observe:['Rozróżniaj moc bezwzględną i względną.','Sprawdź, jak wynik zależy od referencji, preprocessing’u i długości danych.','Interpretuj cechy względem jasno zdefiniowanej normy lub hipotezy badawczej, uwzględniając wiek, stan czuwania, referencję, artefakty i wielokrotne porównania.'],
  trap:'Wartość odstająca od normy statystycznej nie jest równoznaczna z rozpoznaniem klinicznym.',
  task:'Wybierz jedną cechę qEEG i wypisz trzy czynniki techniczne, które mogą zmienić jej wartość bez zmiany stanu klinicznego.'
 },
 mheat:{
  title:'Mapa topograficzna jest interpolacją pomiarów',
  intro:'Mapa topograficzna przedstawia wartości cechy EEG w elektrodach i interpolację między nimi. Interpretacja wymaga znajomości skali kolorów.',
  observe:['Najpierw sprawdź skalę kolorów i jednostkę.','Zwróć uwagę, gdzie rzeczywiście znajdują się elektrody pomiarowe.','Porównuj mapy tylko wtedy, gdy używają zgodnej skali i tego samego sposobu przetwarzania.'],
  trap:'Ostra granica koloru na mapie nie oznacza ostrej granicy neuroanatomicznej.',
  task:'Wyjaśnij, dlaczego ta sama mapa może wyglądać bardziej lub mniej „dramatycznie” po zmianie zakresu skali kolorów.'
 },
 m7:{
  title:'Lokalizacja źródeł to problem odwrotny',
  intro:'Lokalizacja źródeł EEG rozwiązuje problem odwrotny: szacuje źródła wewnątrz mózgu na podstawie potencjałów na skórze głowy. Wynik zależy od modelu głowy i regularizacji.',
  observe:['Oddziel dane pomiarowe od wyniku modelu.','Sprawdź, jakie założenia ograniczają przestrzeń możliwych rozwiązań.','Traktuj wynik jako estymację zależną od modelu, liczby elektrod i jakości geometrii.'],
  trap:'Najbardziej kolorowy obszar rekonstrukcji nie jest bezpośrednim „zdjęciem aktywnego mózgu”.',
  task:'Wymień dwie informacje dodatkowe, które poprawiają wiarygodność lokalizacji źródła poza samym przebiegiem EEG.'
 },
 mclinical:{
  title:'EEG kliniczne wspiera rozpoznanie — nie zastępuje diagnozy',
  intro:'Znaczenie diagnostyczne wzorców EEG zależy od wskazania klinicznego. W ocenie markerów istotne są czułość, swoistość i kontekst badania.',
  observe:['Oddzielaj markery o zastosowaniu klinicznym od korelatów grupowych z badań naukowych.','Pytaj o czułość, swoistość i populację, w której badano marker.','Zwracaj uwagę, czy wynik dotyczy pojedynczego pacjenta, czy różnicy średnich między grupami.'],
  trap:'Korelacja cechy EEG z zaburzeniem nie oznacza, że można na tej podstawie rozpoznać zaburzenie u konkretnej osoby.',
  task:'Dla wybranego przykładu sformułuj osobno: co pokazuje EEG, czego nie pokazuje i jaka informacja kliniczna jest potrzebna dodatkowo.'
 },
 mquiz:{
  title:'Sprawdzaj model mentalny, nie pamięć etykiet',
  intro:'Pytania sprawdzają rozumienie rejestracji EEG, przetwarzania sygnału i interpretacji wyników.',
  observe:['Po każdej odpowiedzi spróbuj wyjaśnić, dlaczego pozostałe możliwości są mniej trafne.','Wracaj do modułu źródłowego, jeśli odpowiedź była zgadywana.','Łącz pojęcia z konkretnym etapem pipeline’u EEG.'],
  trap:'Wysoki wynik testu nie gwarantuje umiejętności poprawnej analizy rzeczywistych danych.',
  task:'Wybierz jedno pytanie i dopisz własny przykład eksperymentalny, który ilustruje sprawdzaną zasadę.'
 },
 mformats:{
  title:'Format pliku wpływa na odtwarzalność analizy',
  intro:'Zapis EEG wymaga próbek, częstotliwości próbkowania, jednostek i nazw kanałów oraz znaczników zdarzeń. Sprawdź, które metadane zachowuje wybrany format.',
  observe:['Sprawdź, czy format zachowuje zdarzenia i metadane.','Rozróżniaj format roboczy programu od formatu wymiany danych.','Kontroluj jednostki oraz skalowanie amplitudy po imporcie i eksporcie.'],
  trap:'Poprawne otwarcie pliku nie dowodzi, że wszystkie metadane zostały zachowane prawidłowo.',
  task:'Wypisz minimalny zestaw informacji, bez którego inna osoba nie mogłaby jednoznacznie zinterpretować zapisanego EEG.'
 },
 mbids:{
  title:'BIDS zamienia zbiór plików w opisany eksperyment',
  intro:'EEG-BIDS standaryzuje strukturę katalogów, nazewnictwo plików i metadane eksperymentu, ułatwiając analizę oraz wymianę danych.',
  observe:['Oddzielaj dane surowe od danych pochodnych.','Trzymaj metadane eksperymentu razem z danymi, których dotyczą.','Stosuj spójne identyfikatory uczestników, sesji, zadań i przebiegów.'],
  trap:'Sama poprawna struktura katalogów nie zapewnia reprodukowalności, jeśli brakuje opisu procedury i parametrów przetwarzania.',
  task:'Wyjaśnij, jakie trzy elementy BIDS najbardziej pomagają osobie, która nie brała udziału w zbieraniu danych.'
 }
};

function esc(s){
 return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function teachingMarkup(x){
 const observations=x.observe.slice(0,2).map(v=>'<li>'+esc(v)+'</li>').join('');
 return '<div class="teaching-extension" data-teaching-extension="1">'+
  '<div class="panel">'+
   '<h2><span class="dot"></span>'+esc(x.title)+'</h2>'+
   '<p>'+esc(x.intro)+'</p>'+
  '</div>'+
  '<div class="grid g2">'+
   '<div class="panel">'+
    '<h2><span class="dot"></span>Co warto zaobserwować?</h2>'+
    '<ul>'+observations+'</ul>'+
   '</div>'+
   '<div class="panel">'+
    '<h2><span class="dot"></span>Sprawdź rozumienie</h2>'+
    '<p>'+esc(x.task)+'</p>'+
    '<div class="module-note"><b>Uwaga:</b> '+esc(x.trap)+'</div>'+
   '</div>'+
  '</div>'+
 '</div>';
}


// Krótkie cele dydaktyczne widoczne na początku każdego modułu.
const LEARNING_GOALS={
 m1x:'Rozpoznasz rytmy EEG, amplitudę w µV i wpływ stanu czuwania na zapis.',
 mfft:'Wyjaśnisz FFT, rozdzielczość częstotliwościową i różnicę między widmem a PSD.',
 mlobes:'Powiążesz topografię elektrod z anatomią, bez utożsamiania elektrody ze źródłem korowym.',
 m2x:'Zrozumiesz system rozmieszczenia elektrod, montaż i rolę referencji.',
 msimlive2:'Odróżnisz sygnał korowy od artefaktów EOG, EMG i zakłóceń pomiarowych.',
 mphys2:'Porównasz źródła, jednostki i dynamikę EEG, EKG, EMG oraz EDA.',
 meye2:'Zinterpretujesz fiksacje, sakkady, ścieżki spojrzenia i ograniczenia heatmap.',
 m3:'Poznasz paradygmat oddball, znaczniki bodźców oraz interpretację ERP N2/P3.',
 mstroop:'Zmierzysz interferencję poznawczą na podstawie czasu i poprawności reakcji.',
 m5:'Prześledzisz filtrację, referencjonowanie, segmentację i kontrolę jakości epok.',
 mica:'Poznasz założenia ICA i kryteria identyfikacji komponentów artefaktowych.',
 mpostx:'Zrozumiesz uśrednianie ERP i estymację widmową na wielu segmentach.',
 mqeeg:'Obliczysz i zinterpretujesz cechy ilościowe EEG, uwzględniając ich ograniczenia.',
 mheat:'Odczytasz mapę topograficzną i odróżnisz pomiar od interpolacji.',
 m7:'Wyjaśnisz problem odwrotny i zależność lokalizacji źródeł od modelu głowy.',
 mclinical:'Rozróżnisz przydatność kliniczną EEG od nieswoistych korelatów grupowych.',
 mquiz:'Sprawdzisz rozumienie pomiaru, przetwarzania i interpretacji EEG.',
 mformats:'Dobierzesz format danych i skontrolujesz zachowanie jednostek oraz metadanych.',
 mbids:'Zorganizujesz zbiór EEG zgodnie z podstawowymi zasadami EEG-BIDS.'
};
function insertLearningGoal(id){
 const module=$('#'+id),goal=LEARNING_GOALS[id];
 if(!module||!goal||module.querySelector('[data-learning-goal]'))return;
 const box=document.createElement('div');
 box.className='panel learning-goal';
 box.dataset.learningGoal='1';
 box.style.marginBottom='16px';
 const h=document.createElement('h2');h.textContent='Czego nauczysz się w tym module?';
 const p=document.createElement('p');p.textContent=goal;
 box.append(h,p);
 const head=module.querySelector('.head');
 if(head)head.after(box);else module.prepend(box);
}

function appendTeaching(id){
 insertLearningGoal(id);
 const module=$('#'+id),lesson=LESSONS[id];
 if(!module||!lesson||module.querySelector('[data-teaching-extension="1"]'))return;
 module.insertAdjacentHTML('beforeend',teachingMarkup(lesson));
}

function appendAllTeaching(){
 Object.keys(LESSONS).forEach(appendTeaching);
}

window.addEventListener('load',()=>{
 setTimeout(removeLegacyIntro,250);
 setTimeout(removeLegacyIntro,850);
 setTimeout(appendAllTeaching,120);
 setTimeout(appendAllTeaching,650);
 setTimeout(appendAllTeaching,1500);
},{once:true});

window.addEventListener('eeg:module',e=>{
 if(e.detail==='m5')requestAnimationFrame(removeLegacyIntro);
 requestAnimationFrame(()=>appendTeaching(e.detail));
});

const main=$('#main');
if(main)new MutationObserver(appendAllTeaching).observe(main,{childList:true});
