document.addEventListener('DOMContentLoaded', function () {

    //-----------------------------------
    //----------- MAP SCRIPTS -----------
    //-----------------------------------
  
    if (document.body.classList.contains('map-page')) {
      const fab = document.getElementById('fab');
      const menu = document.getElementById('fabMenu');
  
      if (fab && menu) {
        fab.onclick = () => {
          menu.classList.toggle('show');
        };
      }
    }

    //-----------------------------------
    //---------- TABLE SCRIPTS ----------
    //-----------------------------------
  
    if (document.body.classList.contains('table-page')) {
      if ($('#birresTable').length) {
        Papa.parse("../data/dades_birres.csv", {
          download: true,
          header: true,
          complete: function(results) {
            const data = results.data;
            const tableBody = $('#birresTable tbody'); 
            data.forEach(row => {
              if (!row.Local) return;
              const link = `<a href="${row.Link}" target="_blank">Maps</a>`;
              const cleanedPrice = row.Preu.replace(',', '.').replace(/[^\d.]/g, '');
              const price = parseFloat(cleanedPrice).toFixed(2);
  
              const tr = `
                <tr>
                  <td>${row.Local}</td>
                  <td>${price}</td>
                  <td>${row.Districte || "—"}</td>
                  <td>${link}</td>
                </tr>`;
              tableBody.append(tr);
            });
  
            $('#birresTable').DataTable({
              paging: false,
              lengthChange: false,
              info: false,
              language: {
                search: '<i class="fas fa-search"></i> ',
                zeroRecords: "No s'han trobat resultats"
              }
            });
          }
        });
      }
    }
  
  });
  