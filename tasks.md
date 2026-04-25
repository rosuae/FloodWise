1. Modulul Hartă Interactivă (The Visual Core)
Aceasta este componenta principală unde utilizatorul vede „inundația invizibilă”.

Layer de Saturație (Heatmap): O suprapunere colorată peste hartă care arată gradul de umiditate a solului (ex: de la albastru deschis la roșu aprins pentru saturație 100%).

Layer de Risc (Vector): Poligoane care marchează parcelele agricole specifice aflate în pericol.

Integrare Date Elevatie (DEM): Un toggle care permite vizualizarea formelor de relief pentru a înțelege unde se va scurge apa în caz de viitură.

2. Dashboard de Monitorizare (The Stats Engine)
O bară laterală sau un panou de control cu metrici în timp real.

Indicator ISS (Index Saturație Subterană): Un ceas sau o bară de progres care arată cât de „plin” este solul în zona selectată.

Corelație Meteo: Un grafic care suprapune umiditatea solului (din Sentinel-1) cu prognoza de precipitații pentru următoarele 48h.

Scor de Probabilitate Viitură: Un procentaj (ex: "85% risc de flash flood în caz de ploaie >10mm").

3. Modulul de Alerte și Notificări (The Early Warning System)
Componenta care „strigă” atunci când AI-ul detectează pericolul.

Centru de Mesagerie: O listă de alerte critice sortate după severitate.

Configurarea Pragurilor: Posibilitatea ca autoritățile sau fermierii să seteze la ce nivel de saturație vor să primească notificare prin SMS/Email.

Buton de "Plan de Adaptare": O fereastră pop-up care apare la alertă și oferă instrucțiuni: "Sol saturat. Deschideți stăvilarele la Canalul A în următoarele 4 ore."

4. Instrumentul de Planificare Logistică (Galileo Integration)
O componentă de navigare și marcare pe teren.

Rute de Evacuare: Calcularea automată a celei mai sigure rute pentru utilaje agricole către puncte înalte, evitând zonele cu saturație mare.

Marcaje "Ground-Truth": O funcție prin care un utilizator aflat pe teren (folosind precizia Galileo) poate pune un pin pe hartă pentru a confirma o băltire, validând astfel datele satelitare.

5. Arhivă și Comparare Istorică (The Training View)
Utilă pentru a demonstra cum a învățat AI-ul.

Time-Slider: O bară cronologică ce permite utilizatorului să vadă cum a evoluat saturația solului în ultimele săptămâni.

Comparare "Înainte și După": Vizualizarea modului în care solul a reacționat la evenimente de inundații trecute (ex: iarna 2015/2016).

---

1. Componenta de Achiziție și Procesare Date (Backend)Aceasta este „inima” sistemului care transformă semnalul satelitar în informație utilă.Sursă Date: Conectare la API-ul Copernicus Data Space Ecosystem pentru a extrage imagini Sentinel-1 (SAR).Procesare Radar: Utilizarea instrumentelor de pe pagina de Tools (precum openEO sau Jupyter Notebooks) pentru a filtra zgomotul și a izola backscatter-ul dielectric al solului.Calcul Index Saturație: Implementarea unei formule care calculează nivelul de umiditate sub suprafață, comparând datele curente cu un baseline istoric (pentru a detecta anomaliile).

2. Componenta de Inteligență Artificială și Predicție (Core Engine)Aici datele brute devin „early warnings”.Model de Clasificare: Un algoritm (ex: Random Forest) antrenat să identifice tiparele de saturație care au precedat inundații istorice (folosind datele de la EO Dashboard).Modul de Prognoză: Integrarea unui API de meteo (precipitații prognozate) cu gradul de saturație detectat pentru a calcula Probabilitatea de Viitură Flash.Corelație Topografică: Suprapunerea hărții de saturație peste un Model Digital de Elevație (DEM) pentru a prezice unde se va acumula apa.

3. Componenta de Vizualizare și Interfață (Frontend Web)Modul în care autoritățile și agricultorii interacționează cu datele.Hartă Interactivă: O interfață web (folosind biblioteci precum Leaflet sau Mapbox) care afișează zonele de risc sub formă de „Heat Map”.Sistem de Alerte: Un dashboard care afișează scorul de risc (ex: 0-100%) și trimite notificări de tip „Early Warning”.Integrare Galileo: Afișarea locațiilor precise ale activelor critice (depozite, utilaje) pentru a planifica rute de evacuare sigure bazate pe datele de poziționare.