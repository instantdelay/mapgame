var map = L.map('map');

var snd = new Audio("lip_sound.mp3");

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
   name: "World"
};
var activeRegion = ALL;
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
      bounds: [[0, 32], [68, 148]]
   },
   {
      name: "Africa",
      bounds: [[-35, -20], [38, 53]]
   },
   {
      name: "Oceania",
      bounds: [[-50, 106], [0, 179]]
   },
   ALL
];
var regionsByName = {};

var regionsDiv = $("#regions");
regions.forEach(function (r) {
   regionsByName[r.name] = r;
   r.total = 0;
   r.found = 0;
   var rd = $('<div class="region"><div class="title">' + r.name + '</div><div>0 / 0</div></div>');
   regionsDiv.append(rd);
   rd.on('click', function(e) {
      activateRegion(r);
   });
   r.elem = rd;
});

function activateRegion(r) {
   if (r === ALL) {
      map.fitWorld();
   }
   else {
      map.fitBounds(r.bounds);
   }

   if (activeRegion) {
      activeRegion.elem.css('background-color', '');
   }
   activeRegion = r;
   activeRegion.elem.css('background-color', '#999');
}

function updateRegionElem(r) {
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
   L.marker(coords, {icon:ic}).addTo(map);
   f.labeled = true;
}

var layer = new L.GeoJSON.AJAX("sovereign_50m.geojson", {
   onEachFeature: function(feature, layer) {
      byName[feature.properties.name.toLowerCase()] = layer;
      byName[feature.properties.name_long.toLowerCase()] = layer;
      
      ALL.total++;

      let region = regionsByName[feature.properties.continent];
      if (!region) {
         region = regionsByName[feature.properties.continent = feature.properties.region_un];
      }

      if (region) {
         region.total++;
      }
      else {
         console.log("Missing region " + feature.properties.continent);
      }
      layer.on('click', function(e2) {
         showLabel(feature);
      });
   },
   style: function(f) {
      return {
         color: '#fff',
         fillColor: '#ddd',
         opacity: 0.8,
         fillOpacity: 0.8,
         weight: 1
      };
   }
});       
layer.on('data:loaded', function(e) {
   regions.forEach(updateRegionElem);
});
layer.addTo(map);

function checkName(name) {
   var l = byName[name.toLowerCase()];
   if (!l || l.found) {
      // Not a match or already found
      return false;
   }

   var region = regionsByName[l.feature.properties.continent];

   if (activeRegion !== ALL && region !== activeRegion) {
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
   snd.play();
   return true;
}

$("#nameBox").on('input', function(e) {
   var box = $(this);
   if (checkName(box.val())) {
      box.val('');
   }
});

$(function() {
   activateRegion(regions[0]);
   $("#nameBox").focus();
});