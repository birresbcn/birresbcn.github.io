function getDistrictInitials(name) {
  if (name.toUpperCase() === 'TOTAL') return 'TOTAL';

  const usesDash = name.includes('-');
  const parts = name.split(/[\s\-]+/).map(w => w[0].toUpperCase());

  return usesDash ? `${parts[0]}-${parts.slice(1).join('')}` : parts.join('');
}




/**
 * Convierte el texto CSV en una estructura de datos utilizando PapaParse.
 */
function parseCSVData(text) {
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  }).data;
}

/**
 * Extrae los datos válidos del CSV, limpiando los precios y filtrando entradas incompletas.
 */
function extractValidData(data) {
  const locals = [];
  const prices = [];
  const districts = [];
  const links = [];

  data.forEach(row => {
    let priceRaw = row['Preu'];
    if (priceRaw) {
      priceRaw = priceRaw.replace('€', '').replace(',', '.').trim();
      const price = parseFloat(priceRaw);
      if (!isNaN(price)) {
        locals.push(row['Local']);
        prices.push(price);
        districts.push(row['Districte']);
        links.push(row['Link'] || ''); // fallback in case it's missing
      }
    }
  });

  return { locals, prices, districts, links };
}


/**
 * Crea un gráfico de barras mostrando el precio promedio por distrito.
 */
function plotBarChart(districts, prices) {
  const districtPriceMap = {};
  districts.forEach((district, i) => {
    if (!districtPriceMap[district]) {
      districtPriceMap[district] = { total: 0, count: 0 };
    }
    districtPriceMap[district].total += prices[i];
    districtPriceMap[district].count += 1;
  });

  const districtAvgArray = Object.keys(districtPriceMap).map(district => ({
    district,
    avgPrice: districtPriceMap[district].total / districtPriceMap[district].count
  }));

  districtAvgArray.sort((a, b) => a.avgPrice - b.avgPrice);


  const barData = [{
    x: districtAvgArray.map(d => d.district),
    y: districtAvgArray.map(d => d.avgPrice.toFixed(2)),
    type: 'bar',
    marker: { color: 'teal' },
    text: districtAvgArray.map(d => d.district),       // Label inside the bar
    textposition: 'inside',                            // Position: inside the bar
    insidetextanchor: 'start',                         // Align text
    textangle: -90,                                    // Optional: rotate text vertically
    textfont: { color: 'white', size: 100 }            // Text styling
  }];
  

  const barLayout = {
    title: { text: 'Preu Promig per Districte', pad: {t:30,b:10,r:10,l:0}, automargin: true},
    xaxis: { showticklabels: false, title: {text: "Districte"}},
    yaxis: { title: { text: 'Preu (€)' }, ticks: 'outside', showline: true, layer: 'above traces' },
    margin: {t:0,b:25,l:60,r:30},
  };

  Plotly.newPlot('barChart', barData, barLayout);
}

/**
 * Genera un diagrama de dispersión con los precios de todos los bares ordenados.
 */
function plotScatterPlot(locals, prices) {
  const barArray = locals.map((name, i) => ({ name, price: prices[i] }));
  barArray.sort((a, b) => a.price - b.price);

  const scatterData = [{
    x: barArray.map((_, i) => i + 1),
    y: barArray.map(b => b.price),
    mode: 'markers+lines',
    type: 'scatter',
    text: barArray.map(b => b.name),
    hovertemplate: '<b>%{text}</b><br>Price: %{y:.2f}€<extra></extra>',
    marker: { size: 8, color: 'indigo' }
  }];

  const scatterLayout = {
    title: { text: 'Preu de cada Bar (Ordenat)',  pad: {t:30,b:10,r:0,l:0}, automargin: true},
    xaxis: { title: { text: 'Bar Index' }, showgrid: false, showline: true, zeroline: false },
    yaxis: { title: { text: 'Preu (€)' }, ticks: 'outside', showline: true },
    margin: {t:0,b:40,l:60,r:30},
   
  };

  Plotly.newPlot('scatterPlot', scatterData, scatterLayout);
}

/**
 * Dibuja un histograma de precios y superpone la curva de distribución normal.
 */
function plotHistogramWithNormalDistribution(prices) {
  const mean = prices.reduce((acc, price) => acc + price, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / prices.length);

  const numPoints = 500;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const step = (10 - 0) / numPoints;

  const xValues = Array.from({ length: numPoints }, (_, i) => 0 + i * step);
  const normalDistribution = xValues.map(x => {
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
  });

  const binWidth = (maxPrice - minPrice) / Math.sqrt(prices.length);
  const scaledNormalDistribution = normalDistribution.map(y => y * prices.length * binWidth);

  const histogramData = [{
    x: prices,
    type: 'histogram',
    marker: { color: 'teal' },
    opacity: 0.6,
    showlegend: false,
    hoverinfo: "x+y"
  }];

  const normalDistData = [{
    x: xValues,
    y: scaledNormalDistribution,
    mode: 'lines',
    line: { color: 'red', width: 2 },
    showlegend: false,
    hoverinfo: "x+y"
  }];

  const histogramLayout = {
    title: { text: 'Histograma i Distribució Normal', pad: {t:30,b:10,r:0,l:0}, automargin: true },
    xaxis: { title: { text: 'Preu (€)' }, range: [minPrice, maxPrice], ticks: 'outside', showline: true },
    yaxis: { title: { text: 'Freqüència' }, range: [0, null], ticks: 'outside', showline: true },
    margin: {t:0,b:40,l:60,r:30},
    annotations: [
      {
        x: 0.75, y: 0.91,
        text: `$\\bar{x}: ${mean.toFixed(2)} \\ €$`,
        xref: 'paper', yref: 'paper',
        showarrow: false,
        font: { color: "rgb(255, 0, 0)" }
      },
      {
        x: 0.75, y: 0.83,
        text: `$s: ${stdDev.toFixed(2)} \\ €$`,
        xref: 'paper', yref: 'paper',
        showarrow: false,
        font: { color: "rgb(255, 0, 0)" }
      }
    ]
  };

  Plotly.newPlot('histogramPlot', [...histogramData, ...normalDistData], histogramLayout);
}


/**
 * Crea gráficos de rosco (donut) por districte amb el percentatge de bars registrats.
 */
function plotCompletenessDonuts(districts, containerId = 'donut-grid') {
  // Total de bars oficials per districte (datos estimats/manuals) !!!UPDATE (https://portaldades.ajuntament.barcelona.cat/ca/estad%C3%ADstiques/fsokzddxhd?view=map)
  const officialTotals = {
    'Ciutat Vella': 405,
    'Eixample': 1001,
    'Gràcia': 259,
    'Horta-Guinardó': 178,
    'Les Corts': 168,
    'Nou Barris': 162,
    'Sant Andreu': 154,
    'Sant Martí': 653,
    'Sants-Montjuïc': 341,
    'Sarrià-Sant Gervasi': 284,
  };

  const countMap = {};
  districts.forEach(d => {
    countMap[d] = (countMap[d] || 0) + 1;
  });

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const allDistricts = ['TOTAL', ...Object.keys(officialTotals)];

  // Calculate total bars for the "TOTAL" donut
  const totalRegistered = Object.keys(officialTotals).reduce((sum, d) => sum + (countMap[d] || 0), 0);
  const totalOfficial = Object.values(officialTotals).reduce((sum, n) => sum + n, 0);

  const getValues = (district) => {
    if (district === 'TOTAL') {
      return [totalRegistered, totalOfficial - totalRegistered];
    } else {
      const reg = countMap[district] || 0;
      const tot = officialTotals[district];
      return [reg, tot - reg];
    }
  };

  const donutFontSize = window.innerWidth < 500 ? 9 : 12;
  allDistricts.forEach((district,i) => {
    const [registered, missing] = getValues(district);
    const percent = ((registered / (registered + missing)) * 100).toFixed(0);

    const div = document.createElement('div');
    div.className = i === 0 ? 'featured' : 'inner';    // div.id = `donut-${district.replace(/\s+/g, '-')}`;
    div.id = `donut-${i}`;
    container.appendChild(div);

    const isTotal = district.toUpperCase() === 'TOTAL';

    const data = [{
      values: [registered, missing],
      labels: ['Registrats', 'Falten'],
      hole: 0.5,
      type: 'pie',
      marker: {
        colors: ['mediumseagreen', 'lightgrey']
      },
      textinfo: "none"
    }];

    const layout = {
      title: isTotal ? 
        { text: ' ', font: { size: 14 },automargin:true, pad: {t:0,b:0,r:10000,l:10000} } : undefined,
      annotations: [
        ...(isTotal
          ? [{
              text: 'Quants bars portem?',
              font: { size: 16 },
              showarrow: false,
              x: 0.5,
              y: 1.012,//change this if title not showing well
              xref: 'paper',
              yref: 'paper',
              xanchor: 'center',
              yanchor: 'bottom',
            }]
          : []),
        
        {
        font: { size: donutFontSize + 2 }, x: 0.5, y: 0.5,
        showarrow: false,
        text: `${percent}%<br><span style="font-size:${donutFontSize}px">${registered}/${registered + missing}</span>`,
      },
      {
        font: { size: 14 }, x: isTotal ? 0.5 : 0.95, y: isTotal ? 0.06 : 1.0,
        bgcolor: 'rgb(247, 202, 217)',
        bordercolor: 'rgb(63, 63, 63)',
        showarrow: false,
        text: `${getDistrictInitials(district)}`,
      }],
      showlegend: false,
      margin: { t: 0, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot(div.id, data, layout, {
      displaylogo: false,          // 🔹 removes the Plotly logo
      modeBarButtonsToRemove: [ 'toImage',],
      responsive: true             // 🔹 optional: makes charts responsive
    });  
  });
}


/**
 * Genera dos tablas HTML: Top 5 bares más baratos y más caros.
 */
function generateTop5Tables(locals, prices, districts, links, containerId = 'top5Table') {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const barData = locals.map((name, i) => ({
    name,
    price: prices[i],
    district: districts[i],
    link: links[i]
  }));

  const cheapest = [...barData].sort((a, b) => a.price - b.price).slice(0, 5);
  const mostExpensive = [...barData].sort((a, b) => b.price - a.price).slice(0, 5);

  let showingCheapest = true;

  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Mostrar Més Cars';
  toggleButton.style.marginBottom = '12px';
  toggleButton.style.padding = '6px 12px';
  toggleButton.style.border = 'none';
  toggleButton.style.backgroundColor = '#009688';
  toggleButton.style.color = 'white';
  toggleButton.style.borderRadius = '6px';
  toggleButton.style.cursor = 'pointer';

  const table = document.createElement('table');
  table.className = 'top5-table';

  const renderTable = () => {
    const data = showingCheapest ? cheapest : mostExpensive;
    const title = showingCheapest ? 'Top 5 Més Barats' : 'Top 5 Més Cars';

    table.innerHTML = `
      <thead><tr><th colspan="2">${title}</th><th>Preu (€)</th></tr></thead>
      <tbody>
        ${data.map((bar, i) => `
          <tr>
            <td style="width: 0px;">${i + 1}.</td>
            <td>
              <a href="${bar.link}" target="_blank" rel="noopener noreferrer">${bar.name}</a>
              <span style="color: #555;"> (${bar.district})</span>
            </td>
            <td style="text-align: center;">${bar.price.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
  };

  toggleButton.addEventListener('click', () => {
    showingCheapest = !showingCheapest;
    toggleButton.textContent = showingCheapest ? 'Mostrar Més Cars' : 'Mostrar Més Barats';
    renderTable();
  });

  container.appendChild(toggleButton);
  container.appendChild(table);
  renderTable();
}



// Average price
// Most/Least Expensive
// Most/Least Expensive District
// Coverage (+max/min district covered)
function funInfo(prices, locals, districts) {
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minIndex = prices.indexOf(minPrice);
  const maxIndex = prices.indexOf(maxPrice);

  const mostExpensiveBar = locals[maxIndex];
  const cheapestBar = locals[minIndex];

  // District averages
  const districtPriceMap = {};
  districts.forEach((district, i) => {
    if (!districtPriceMap[district]) {
      districtPriceMap[district] = { total: 0, count: 0 };
    }
    districtPriceMap[district].total += prices[i];
    districtPriceMap[district].count += 1;
  });

  const districtAvgs = Object.entries(districtPriceMap).map(([district, { total, count }]) => ({
    district,
    avg: total / count
  }));

  districtAvgs.sort((a, b) => a.avg - b.avg);
  const cheapestDistrict = districtAvgs[0].district;
  const mostExpensiveDistrict = districtAvgs.at(-1).district;

  const summaryHTML = `
    <p><strong>Preu mitjà:</strong> ${avg.toFixed(2)} €</p>
    <p><strong>Bar més car:</strong> ${mostExpensiveBar} (${maxPrice.toFixed(2)} €)</p>
    <p><strong>Bar més barat:</strong> ${cheapestBar} (${minPrice.toFixed(2)} €)</p>
    <p><strong>Districte més car:</strong> ${mostExpensiveDistrict}</p>
    <p><strong>Districte més barat:</strong> ${cheapestDistrict}</p>
    <p><strong>Total de bars registrats:</strong> ${locals.length}</p>
  `;

  document.getElementById("summary").innerHTML = summaryHTML;
}

function funInfo(prices, locals, districts) {
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minIndex = prices.indexOf(minPrice);
  const maxIndex = prices.indexOf(maxPrice);

  const mostExpensiveBar = locals[maxIndex];
  const cheapestBar = locals[minIndex];

  // District averages
  const districtPriceMap = {};
  const districtCountMap = {};
  districts.forEach((district, i) => {
    if (!districtPriceMap[district]) {
      districtPriceMap[district] = { total: 0, count: 0 };
      districtCountMap[district] = 0;
    }
    districtPriceMap[district].total += prices[i];
    districtPriceMap[district].count += 1;
    districtCountMap[district]++;
  });

  const districtAvgs = Object.entries(districtPriceMap).map(([district, { total, count }]) => ({
    district,
    avg: total / count,
    count
  }));

  districtAvgs.sort((a, b) => a.avg - b.avg);
  const cheapestDistrict = districtAvgs[0].district;
  const mostExpensiveDistrict = districtAvgs.at(-1).district;

  // District with max/min coverage
  const mostCovered = districtAvgs.reduce((a, b) => (a.count > b.count ? a : b));
  const leastCovered = districtAvgs.reduce((a, b) => (a.count < b.count ? a : b));

  const summaryHTML = `
    <p>Pels amics frikis de l'estadística, aquí trobareu gràfiques i taules que expliquen com ronden els preus de la cervesa a la ciutat.</p>
    <p>De mitjana, una birra a Barcelona costa <strong>${avg.toFixed(2)} €</strong>.  
    El rècord de "Bar més barat" se l'emporta <strong><i>${cheapestBar}</i></strong> amb només <strong>${minPrice.toFixed(2)} €</strong>,  
    mentre que el més car és <strong><i>${mostExpensiveBar}</i></strong> amb un preu de <strong>${maxPrice.toFixed(2)} €</strong> (damn!).</p>
    
    <p>Pel que fa als districtes, 
    <strong>${mostExpensiveDistrict}</strong> és on haurem de deixar més pasta,  
    mentre que a <strong>${cheapestDistrict}</strong> la cosa està més barata.</p>
    
    <p>Fins ara, tenim registrats un total de <strong>${locals.length}</strong> bars a Barcelona,
    amb <strong>${mostCovered.district}</strong> liderant la llista amb <strong>${mostCovered.count}</strong> locals i  
    <strong>${leastCovered.district}</strong> tancant la cua amb només <strong>${leastCovered.count}</strong>.  
    Ara bé, encara ens falta molt per arribar als milers de bars que hi ha escampats per la ciutat.
    Per això... <strong>Necessitem el vostre ajuda!</strong> Contribueix amb els bars que visitis a través d'aquest   
    <a href="https://forms.gle/uKCZcvZNR6xTuZHCA" target="_blank">formulari</a>.</p>
  `;


  document.getElementById("summary").innerHTML = summaryHTML;
}



// Punto de entrada: carga el CSV y genera los gráficos
fetch('../data/dades_birres.csv')
  .then(response => response.text())
  .then(text => {
    const rawData = parseCSVData(text);
    const { locals, prices, districts, links } = extractValidData(rawData);

    funInfo(prices,locals,districts)

    plotHistogramWithNormalDistribution(prices);
    plotBarChart(districts, prices);
    plotScatterPlot(locals, prices);
    generateTop5Tables(locals, prices, districts, links);
    plotCompletenessDonuts(districts);
  });
