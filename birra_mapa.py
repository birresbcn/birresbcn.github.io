"""
Genera un fichero HTML con un mapa de precios de birra de BCN.

MEJORAS:
- Poner limites? Limitar zona BCN/CAT [Maybe]
- Search/Filter Price (Range)? [TagFilterButton]
- Add buymeabear (buymeacoffe)

- Popup-font: inter
- Popup-link: yellow box + icon ph


Miki & Diegonti [26/04/2025]
"""

import pandas as pd
from matplotlib import colors
import folium
from folium import Element
from folium.plugins import  Search, LocateControl, TagFilterButton
from pathlib import Path

CWD = Path(__file__).parent.resolve()

#####################################################################################
###################################### FUNCIONS #####################################
#####################################################################################

def add_element_html(map, section, element):
    """ Injecta raw HTML/JS/CSS al mapa final de folium."""
    root = map.get_root()
    if not hasattr(root, section):
        raise ValueError(f"Unknown part '{section}'.  Must be one of: {', '.join(root.__dict__.keys())}")
    getattr(root, section).add_child(Element(element))


#####################################################################################
############################## CONFIGURACIÓ INICIAL #################################
#####################################################################################

# Ruta als fitxers i/o
ruta_csv = CWD / "data" / "dades_birres.csv"
output_html = CWD / "index.html"


# Configuració mapa
estil_mapa    = "CartoDB.Voyager"   # Opcions: https://leaflet-extras.github.io/leaflet-providers/preview/ (OpenStreetMap, CartoDB.Voyager, Esri.WorldTopoMap)
pos_inicial   = [41.3879, 2.1699]   # Posició inicial del mapa (coordenades)
gradient_vals = {                   # Gradient de colors
    "0.0": 'white',
    "0.2": 'blue',
    "0.4": 'green',
    "0.6": 'yellow',
    "0.8": 'orange',
    "1.0": 'red'
}

#####################################################################################
################################ PROGRAMA PRINCIPAL #################################
#####################################################################################

# Carregar les dades amb Pandas
dades = pd.read_csv(ruta_csv).drop_duplicates(subset='Local', keep='last')
dades[['latitude', 'longitude']] = dades['Coordenades'].str.split(',', expand=True).astype(float)


# Normalitza preu (per gradient)
dades['Preu'] = dades['Preu'].str.replace('€', '', regex=False).str.replace(',', '.', regex=False).str.strip().astype(float).round(2)
min_preu, max_preu = dades['Preu'].min(), dades['Preu'].max()
dades['preu_norm'] = (dades['Preu'] - min_preu) / (max_preu - min_preu)
dades['preu_norm'] = dades['Preu'] / max_preu


# Gradient de colors
gradient_keys = sorted(gradient_vals.keys())
gradient_colors = [gradient_vals[k] for k in gradient_keys]
cmap = colors.LinearSegmentedColormap.from_list("custom_gradient", list(zip(map(float, gradient_keys), gradient_colors)))

# Mapa
barcelona_map = folium.Map(location=pos_inicial, zoom_start=12, control_scale=True, tiles=estil_mapa)
LocateControl(auto_start=True, keepCurrentZoomLevel=True, drawCircle=False).add_to(barcelona_map)

# HeatMap
# heat_data = dades[['latitude', 'longitude', 'Preu']].values.tolist()
# HeatMap(heat_data, min_opacity=0.2, gradient={"0.0": "white", "1.0": "black"}).add_to(barcelona_map)

# Layer for colored markers
marker_layer = folium.FeatureGroup(name="Bars").add_to(barcelona_map)

# List to store GeoJson-like features for search
geojson_features = []

# Add markers
for _, row in dades.iterrows():

    lat, lon = float(row['latitude']), float(row['longitude'])
    norm = float(row['preu_norm'])
    fill_color = colors.to_hex(cmap(norm))
    name = row["Local"]
    popup_text = f"""
    <div class="popup-container">
        <b class="popup-title">{name}</b>
        <br><span class="popup-price">{row['Preu']}€</span> &nbsp;  <span class="popup-date">{row['Data']}</span>
        <br><a class="popup-link" href="{row['Link']}" target="_blank">Google Maps</a>
    </div>"""
    popup = folium.Popup(popup_text, max_width=400)

    # Afegir marcadors personalitzats amb el nom del local i el preu
    folium.CircleMarker(
        location = [lat, lon],   # Coordenades al mapa
        radius = 10,             # Radi del marker
        popup = popup,           # HTML popup
        color = "black",         # Color contorn
        weight = 0.5,              # Gruix contorn
        fill = True,             # Relleno
        fill_color = fill_color, # Color relleno
        fill_opacity = 1,        # Opacitat
        tags = [row["Districte"]], # Tags per filtrar
    ).add_to(marker_layer)

    # Afegir a geoJSON pel Search
    geojson_features.append({
        "type": "Feature",
        "properties": {"name": name, "preu": row['Preu'], "barri": row['Districte']},
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    })

# Capa GeoJSON invisible (just for Search)
search_layer = folium.GeoJson(
    {"type": "FeatureCollection", "features": geojson_features},
    name="SearchLayer",
    show=False,
    marker=folium.CircleMarker(stroke=False,fill=False)
).add_to(barcelona_map)

# Search funcionalitat
Search(
    layer = search_layer,
    search_label = "name",
    placeholder = "Cerca un bar...",
    collapsed = True
).add_to(barcelona_map)

# Add TagFilterButton
tag_filter_button = TagFilterButton(
    dades["Districte"].unique().tolist(), 
    layer_name="Districte", 
    collapsed=True,
).add_to(barcelona_map)

#####################################################################################
################################ AFEGIR COSES EXTRA #################################
#####################################################################################

# Títol i favicon a <head>
add_element_html(barcelona_map,"header",
                 '<title>BirresBCN</title>')
add_element_html(barcelona_map,"header",
                 '<link rel="icon" href="img/favicon.png">')

# Botó de info/taula/contribuir
add_element_html(barcelona_map,"html",
    """
    <button id="fab">≡</button>
    <div class="fab-menu" id="fabMenu">
      <a href="about/" target="_self"><i class="fa fa-info-circle"></i></a>
      <a href="table/" target="_self"><i class="fa fa-table"></i></a>
      <a href="plots/" target="_self"><i class="fas fa-chart-column"></i></a>
      <a href="https://forms.gle/uKCZcvZNR6xTuZHCA"  target="_blank">+ &#127866</a>
    </div>
""")

# JS/CSS external files
add_element_html(barcelona_map,"html",
                 '<link rel="preconnect" href="https://rsms.me/">')
add_element_html(barcelona_map,"html",
                 '<link rel="stylesheet" href="https://rsms.me/inter/inter.css">')
add_element_html(barcelona_map,"html",
                 '<script src="script.js"></script>')
add_element_html(barcelona_map,"html",
                 '<link rel="stylesheet" href="styles.css">')



#####################################################################################
#################################### GUARDAR HTML ###################################
#####################################################################################

# Save
barcelona_map.save(output_html)


# Add class to body tag
with open(output_html, 'r', encoding='utf8') as file:
    content = file.read()

content = content.replace('<body>', '<body class="map-page">')

with open(output_html, 'w', encoding='utf8') as file:
    file.write(content)