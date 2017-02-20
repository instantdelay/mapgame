var map = L.map('map');

var namedSound = new Audio("lip_sound.mp3");
var regionSound = new Audio("glockenspiel_selection.mp3");

var byName = {};
var centers = {};
var colors = [
   '#ffffcc',
   '#ffeda0',
   '#fed976',
   '#feb24c',
   '#fd8d3c',
   '#fc4e2a',
   '#e31a1c'
];

var ALL = {
   name: "World",
   bounds: [[-56, -218], [66, 179]]
};
var selectedRegion = ALL;
var regions = [
   {
      name: "North America",
      bounds: [[6, -135], [55, -60]]
   },
   {
      name: "South America",
      bounds: [[-45, -84], [13, -34]]
   },
   {
      name: "Europe",
      bounds: [[33, -18], [66, 44]]
   },
   {
      name: "Asia",
      bounds: [[-12, 32], [55, 148]]
   },
   {
      name: "Africa",
      bounds: [[-35, -20], [38, 53]]
   },
   {
      name: "Oceania",
      bounds: [[-50, 106], [7, 179]]
   },
   ALL
];
var regionsByName = {};

var regionsDiv = $("#regions");
regions.forEach(function (r) {
   regionsByName[r.name] = r;
   r.total = r.found = 0;
   r.nations = [];
   var rd = $('<div class="region"><div class="title">' + r.name + '</div><div>0 / 0</div></div>');
   regionsDiv.append(rd);
   rd.on('click', function(e) {
      selectRegion(r);
   });
   r.elem = rd;
});

function selectRegion(r) {
   map.fitBounds(r.bounds);

   if (selectedRegion && selectedRegion !== r) {
      selectedRegion.elem.removeClass("selected");
      deactivateRegion(selectedRegion);
   }

   selectedRegion = r;
   r.elem.addClass("selected");
   activateRegion(r);

   $("#nameBox").focus();
}

function activateRegion(r) {
   r.nations.forEach(function(l) {
      l.setStyle({'fillOpacity': 1});
   });
}

function deactivateRegion(r) {
   r.nations.forEach(function(l) {
      l.setStyle({'fillOpacity': 0.4});
   });
}

function updateRegionElem(r) {
   if (r.found == r.total) {
      r.elem.addClass('completed');
   }
   $(r.elem.children()[1]).text(r.found + " / " + r.total);
}

$.getJSON("country_labels.geojson", function(data) {
   data.features.forEach(function(f) {
      if (f.properties.sovereignt == f.properties.admin) {
         centers[f.properties.sovereignt] = f.geometry.coordinates.reverse();
      }
   });
});

function showLabel(f) {
   if (f.labeled) {
      return;
   }
   var ic = L.divIcon({
      className: 'label',
      html: '<span>' + f.properties.name_long + '</span>'
   });
   var coords = centers[f.properties.sovereignt];
   if (f.properties.continent == "Oceania" && coords[1] < 0) {
      // see: fixOceania
      coords[1] += 360;
   }
   L.marker(coords, {icon:ic}).addTo(map);
   f.labeled = true;
}

function fixOceania(f) {
   // Some of the places in Oceania are east enough that they wrap to negative longitude
   // Add 360 so they show up near the others...
   // TODO Edit this in the source data??
   var polys = f.geometry.type == 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
   polys.forEach(function(poly) {
      if (poly[0][0][0] < 0) {
         poly[0].forEach(function(coord) {
            coord[0] += 360;
         });
      }
   });
}

var layer = new L.GeoJSON.AJAX("sovereign_50m.geojson", {
   onEachFeature: function(feature, layer) {
      if (feature.properties.type == 'Indeterminate') {
         return;
      }

      byName[feature.properties.name.toLowerCase()] = layer;
      byName[feature.properties.name_long.toLowerCase()] = layer;
      
      ALL.total++;
      ALL.nations.push(layer);

      let region = regionsByName[feature.properties.continent];
      if (!region) {
         region = regionsByName[feature.properties.continent = feature.properties.region_un];
      }

      if (region) {
         region.total++;
         region.nations.push(layer);
      }
      else {
         console.log("Missing region " + feature.properties.continent);
      }
      layer.on('click', function(e2) {
         showLabel(feature);
      });
   },
   filter: function(f) {
      if (f.properties.continent == 'Oceania') {
         fixOceania(f);
      }
      return true;
   },
   style: function(f) {
      return {
         color: '#fff',
         fillColor: '#ddd',
         opacity: 0.8,
         fillOpacity: 0.4,
         weight: 1
      };
   }
});
layer.on('data:loaded', function(e) {
   regions.forEach(updateRegionElem);
   activateRegion(selectedRegion);
});
layer.addTo(map);

function completeRegion() {
   regionSound.play();
   setTimeout(function() {
      for (let i = 0; i < regions.length; i++) {
         if (regions[i].found < regions[i].total) {
            selectRegion(regions[i]);
            break;
         }
      }
   }, 1000);
}

function checkName(name) {
   var l = byName[name.toLowerCase()];
   if (!l || l.found) {
      // Not a match or already found
      return false;
   }

   var region = regionsByName[l.feature.properties.continent];

   if (selectedRegion !== ALL && region !== selectedRegion) {
      // Not in the current region
      // TODO Maybe flash or something?
      return false;
   }

   l.setStyle({
      fillColor: colors[l.feature.properties.mapcolor7 - 1]
      // fillColor: '#32cd32'
   });
   l.found = true;
   ALL.found++;

   region.found++;
   updateRegionElem(region);
   updateRegionElem(ALL);

   showLabel(l.feature);

   if (region.found == region.total) {
      completeRegion();
   }
   else {
      namedSound.play();
   }
   return true;
}

$("#nameBox").on('input', function(e) {
   var box = $(this);
   if (checkName(box.val())) {
      box.val('');
   }
});

$(function() {
   selectRegion(regions[0]);
   $("#nameBox").focus();
});