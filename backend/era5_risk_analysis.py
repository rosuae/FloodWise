"""
Flood Risk Analysis starting from Copernicus ERA5-Land Data.

INSTRUCTIUNI DE CONFIGURARE CDS API:
-----------------------------------
Pentru a descarca date de la Copernicus (Climate Data Store), ai nevoie de un cont
si de configurarea cheii API in directorul utilizatorului tau.

1. Creeaza un cont pe: https://cds.climate.copernicus.eu/
2. Dupa autentificare, du-te la profilul tau si copiaza URL-ul si cheia API.
3. Creeaza in directorul tau "Home" (ex: C:\\Users\\numeletau\\ pe Windows sau ~/.cdsapirc pe Linux/Mac)
   un fisier numit exact `.cdsapirc` care sa contina:

url: https://cds.climate.copernicus.eu/api/v2
key: UID-UL_TAU:CHEIA_TA_API_SECRETA

4. Instaleaza dependentele din terminal:
   pip install cdsapi xarray netCDF4 matplotlib pandas scipy
"""

import os
import cdsapi
import xarray as xr
import pandas as pd
import matplotlib.pyplot as plt
import zipfile
from datetime import datetime, timedelta, timezone

# Initializam clientul API Copernicus
c = cdsapi.Client()

def download_era5_data(
    output_filename="era5_flood_data.nc",
    north=44.6, west=25.9, south=44.3, east=26.2,  # COORDONAAAATEEEEE: ~Bucuresti/Ilfov
    days_back=30
):
    """
    Descarca date ERA5-Land (NetCDF) pentru un perimetru (bounding box) definit.
    Parametri vizati:
      - total_precipitation (m)
      - temperature_2m (K)
    """
    print(f"Pregatire cerere CDS API. Descarcare istoric pentru ultimele {days_back} zile...")
    
    # Calculam intervalul minim de timp necesar real ca sa nu depasim limita CDS API
    # Folosim timezone-aware objects pentru a repara eroarea DeprecationWarning
    end_date = datetime.now(timezone.utc) - timedelta(days=5) 
    start_date = end_date - timedelta(days=days_back)
    
    # Generam DOAR zilele si lunile specifice intervalului din ultimele 30 zile 
    # (anterior, range(1,13) si range(1,32) cereau tot anul generand 'cost limits exceeded')
    time_span = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
    
    years = list(set([str(d.year) for d in time_span]))
    months = list(set([str(d.month).zfill(2) for d in time_span]))
    days = list(set([str(d.day).zfill(2) for d in time_span]))
    times = [f"{str(h).zfill(2)}:00" for h in range(24)]

    try:
        # Nota: in productie am rula pe luna curenta si precedenta mai strict.
        c.retrieve(
            'reanalysis-era5-land',
            {
                'variable': [
                    'total_precipitation',
                    '2m_temperature',
                ],
                'year': years,
                'month': months,
                'day': days,
                'time': times,
                'area': [
                    north, west, south, east,
                ],
                'data_format': 'netcdf',
                'download_format': 'unarchived',
            },
            output_filename
        )
        
        # Verificam daca returnul de la Copernicus este compriat ZIP si il extragem
        if zipfile.is_zipfile(output_filename):
            print("Arhiva ZIP detectata de la Copernicus. Extragem datele...")
            with zipfile.ZipFile(output_filename, 'r') as z:
                # Cautam fisierul .nc in interior
                nc_files = [f for f in z.namelist() if f.endswith('.nc')]
                if nc_files:
                    target_extracted = nc_files[0]
                    target_dir = os.path.dirname(os.path.abspath(output_filename))
                    z.extract(target_extracted, path=target_dir)
                    
                    # Inlocuim zip-ul golit cu purul netcdf
                    os.remove(output_filename)
                    os.rename(os.path.join(target_dir, target_extracted), output_filename)
                    print("Datele extrase cu succes din arhiva.")
                    
        print(f"Datele au fost descarcate si pregatite local ca {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Eroare la descarcare CDS API: {str(e)}")
        print("Asigura-te ca fisierul .cdsapirc este configurat corect si licentele sunt acceptate.")
        return None

def analyze_flood_risk(netcdf_file):
    """
    Proceseaza datele NetCDF descarcate si aplica logica de alerta de inundatii.
    """
    if not os.path.exists(netcdf_file):
        print("Fisierul de date nu a fost gasit!")
        return

    print("\n--- Incepere Analiza Date ERA5-Land ---")
    
    # Incarcam dataset-ul si verificam coruptia / golirea
    try:
        ds = xr.open_dataset(netcdf_file)
        if len(ds.data_vars) == 0:
            raise ValueError("Dataset-ul este complet gol, fara nicio variabila.")
    except Exception as e:
        raise RuntimeError(f"Eroare: Fisierul NetCDF '{netcdf_file}' pare a fi gol, incomplet sau corupt. Detalii: {str(e)}")

    
    # ERA5 ofera precipitatiile in metri, dar pot fi valori acumulate per fereastra de forecast.
    # Folosim .diff() cu o corectie pozitiva (.clip) pentru a prelua valoarea ploii proaspete la acea ora, 
    # curatand eventuale resetari negative in miez de noapte.
    
    precip_raw_m = ds['tp'].mean(dim=['latitude', 'longitude']) 
    temp_k = ds['t2m'].mean(dim=['latitude', 'longitude'])
    
    # Construim un tabel Pandas usor de prelucrat in timp
    df = pd.DataFrame({
        'time': precip_raw_m['valid_time'].values,
        'accumulated_tp_m': precip_raw_m.values, 
        'temp_celsius': temp_k.values - 273.15 # convertire Kelvin in Celsius
    }).set_index('time')
    
    # Sortam cronologic
    df = df.sort_index()
    
    # Diferenta pentru a obtine cantitatea orara de precipitatii m -> transformata in mm (* 1000)
    df['precip_mm_h'] = (df['accumulated_tp_m'].diff().clip(lower=0).fillna(0)) * 1000
    
    # Exportam datele curatate intr-un fisier CSV util pentru colegii tai din echipa Geo
    csv_output = os.path.join(os.path.dirname(os.path.abspath(__file__)), "era5_processed_data.csv")
    df.to_csv(csv_output)
    print(f"[EXPORT] Datele .nc au fost decodate si salvate tabelar în CSV: {csv_output}")
    
    # Calculăm precipitatiile zilnice: 
    daily_precip = df['precip_mm_h'].resample('D').sum()
    daily_temp_max = df['temp_celsius'].resample('D').max()
    
    ######################################################################
    # INTEGRAREA MODULELOR COLEGILOR TAI (Variabile Geologice si de Relief)
    ######################################################################
    def calculate_soil_modifier(texture: str, slope_deg: float) -> float:
        """
        Calculează un factor de modificare a pragului de inundatie bazat pe sol/panta.
        Solul argilos reține apa (deci inundatie mai rapida), în timp ce panta scade retentia dar poate creste scurgerea (Flash).
        """
        modifier = 1.0
        tex = texture.lower()
        if "argila" in tex or "clay" in tex:
            modifier *= 0.6  # Prag necesar scade (satureaza imediat)
        elif "nisip" in tex or "sand" in tex:
            modifier *= 1.2  # Absoarbe si dreneaza adanc, deci rezista la prag mai mare
            
        if slope_deg > 20:
            modifier *= 0.7  # La fel, viteza de colectare intr-un bazin creste datorita gravitatiei 
        elif slope_deg > 10:
            modifier *= 0.85
            
        # Tinem pragul final in limite echilibrate
        return max(0.4, min(1.5, modifier))

    # Testam cu valori primite teoretic din restul platformei voastre
    coleg_sol_textura = "argila umeda"
    coleg_panta = 12.0
    
    baseline_underground_threshold_mm = 150.0 
    
    # Calculam factorul exact bazat pe formule si il aplicam
    soil_modifier = calculate_soil_modifier(coleg_sol_textura, coleg_panta)
    effective_saturation_threshold = baseline_underground_threshold_mm * soil_modifier 
    print(f"Modul extern aplicat (Textura: {coleg_sol_textura}, Panta: {coleg_panta}°)")
    print(f"Prag ajustat prin algoritm din 150mm standard -> {effective_saturation_threshold:.1f} mm")
    
    ######################################################################
    # 1. RISC INUNDATIE SUBTERANA (Acumulare apa pe 30 de zile)
    ######################################################################
    total_30d_precip = df['precip_mm_h'].sum() 
    print(f"\n[ANALIZA] Precipitatii totale (30 zile cumulative): {total_30d_precip:.2f} mm")
    
    if total_30d_precip >= effective_saturation_threshold:
         print("[ALERTA CRITICA] INUNDATIE DE SATURATIE (Groundwater)! Solul si-a depasit capacitatea de absortie.")
    else:
         print("[OK] Nivel de saturatie sol: Sigur.")

    ######################################################################
    # 2. RISC INUNDATIE PLUVIALA (FLASH FLOOD - varfuri orare abrupte)
    ######################################################################
    flash_flood_threshold_hr = 15.0 # Peste 15 l/mp intr-o singura ora = Risc sever scurgeri
    max_hourly_precip = df['precip_mm_h'].max()
    print(f"\n[ANALIZA] Valoarea maxima orara inregistrata: {max_hourly_precip:.2f} mm/h")
    
    if max_hourly_precip > flash_flood_threshold_hr:
         print("[ALERTA CRITICA] FLASH FLOOD! Viituri pluviale orare detectate / posibile pe date istorice de radar.")
    else:
         print("[OK] Risc de viituri pluviale instantanee: Scazut.")

    ######################################################################
    # 3. TREND DE DESERTIFICARE (Seceta prelungita asociata cu arsita)
    ######################################################################
    # Detectare minimalista: putine precipitatii pe termen lung asociate cu varfuri mari de temperatura
    avg_temp_30d = df['temp_celsius'].mean()
    dry_days_count = (daily_precip < 1.0).sum()
    print(f"\n[ANALIZA] Zile fara ploaie semnificative (<1mm): {dry_days_count}/30 zile. Temp medie: {avg_temp_30d:.1f} C")
    
    if dry_days_count > 25 and avg_temp_30d > 28.0:
        print("[AVERTISMENT] DESERTIFICARE / STRES HIDRIC: Temperatura foarte mare combinata cu lipsa majora a ploilor.")
    elif dry_days_count <= 10:
         print("[OK] Risc hidric / seceta: Sol rehidratat normal.")
    else:
         print("[INFO] Conditii medii climatice pentru perioada.")

    # Generam Vizualizarea Analitica
    generate_trend_chart(daily_precip, effective_saturation_threshold)

def generate_trend_chart(daily_precip, saturation_threshold):
    """
    Genereaza un grafic de istoric cu matplotlib:
    Precipitatiile zilnice peste timp + Linia cumulata vs Pragul de saturatie
    """
    # Calculam cumulul de ploaie folosind o suma curenta
    cumulative_precip = daily_precip.cumsum()

    plt.style.use('dark_background')
    fig, ax1 = plt.subplots(figsize=(12, 6))

    # Ax 1: Bara pentru precipitatiile din fiecare zi (mm)
    color1 = 'tab:cyan'
    ax1.set_xlabel('Data', fontsize=12)
    ax1.set_ylabel('Precipitatii Zilnice (mm)', color=color1, fontsize=12)
    ax1.bar(daily_precip.index, daily_precip, color=color1, alpha=0.6, label='Ploaie zilnica')
    ax1.tick_params(axis='y', labelcolor=color1)
    
    # Ax 2: Linie secunadara pentru cumulul pe intreaga luna si pragul periculos
    ax2 = ax1.twinx()  
    color2 = 'tab:orange'
    ax2.set_ylabel('Acumulare Totala (mm)', color=color2, fontsize=12)
    ax2.plot(cumulative_precip.index, cumulative_precip, color=color2, linewidth=3, label='Cumulat 30 Zile')
    ax2.tick_params(axis='y', labelcolor=color2)

    # Trasarea Praggului critic de saturatie modificat de parametri colegilor tai
    ax2.axhline(y=saturation_threshold, color='crimson', linestyle='--', linewidth=2.5, label=f'Prag Eroziune Argila ({saturation_threshold}mm)')

    # Styling si Salvare 
    plt.title('Copernicus ERA5-Land Flood Risk Tracker (Model Hibrid)', fontsize=15, pad=15)
    fig.tight_layout()
    fig.legend(loc='upper left', bbox_to_anchor=(0.1, 0.9))
    
    chart_path = "flood_risk_analysis_chart.png"
    plt.savefig(chart_path, dpi=300)
    print(f"\n[VIZUALIZARE] Graficul de evolutie a fost salvat in: {chart_path}")
    plt.close()

if __name__ == "__main__":
    import sys
    
    filename = "era5_surface_data.nc"
    
    print("Meniu Analiza Risc FloodWise - Copernicus ERA5 Data")
    print("1. Descarca date noi din satelit (CDS API)")
    print("2. Prelucreaza si analizeaza netcdf existent (daca ai dat deja download)")
    
    # Daca vrem doar sa rulam direct fara meniu (comentam meniul in productie)
    # Putem apela mereu download urmat de analiza, dar CDS API poate fi lent
    # si fisierul cantareste cateva sute MB la zone mari.
    
    # Exemplu direct rulated (mock-it if you don't have .cdsapirc config loaded):
    if not os.path.exists(filename):
        print(f"Nu exista fisier local {filename}. Incercam sa descarcam de la Copernicus...")
        res = download_era5_data(output_filename=filename, days_back=30)
        if res:
            analyze_flood_risk(res)
    else:
        print("Rulare analiza pe setul deja descarcat offline...")
        analyze_flood_risk(filename)
