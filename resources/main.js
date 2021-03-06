const map = L.map('map', {
   preferCanvas: true
});

const MAP_DATA_FILE = "data/sovereign_50m_simple.geojson";
const LABEL_DATA_FILE = "data/country_labels.geojson";
const namedSound = new Audio("sound/lip_sound.mp3");
const regionSound = new Audio("sound/glockenspiel_selection.mp3");
const wrongSound = new Audio("sound/dustyroom_multimedia_removal_select_tone.mp3");

const byName = {};
const allByName = {};
const centers = {};
const colors = [
   '#ffffcc',
   '#ffeda0',
   '#fed976',
   '#feb24c',
   '#fd8d3c',
   '#fc4e2a',
   '#e31a1c'
];

class Region {
   constructor(name, bounds) {
      this.name = name;
      this.bounds = bounds;
      this.found = 0;
      this.nations = [];
      this.sub = {};
      Region.byName[name] = this;
   }

   isComplete() {
      return this.found >= this.nations.length;
   };
   getRatioText() {
      return this.found + " / " + this.nations.length;
   }
   activate() {
      console.log('what');
      this.nations.forEach(function(l) {
         l.setStyle({'fillOpacity': 1});
      });
   }
   deactivate() {
      this.nations.forEach(function(l) {
         l.setStyle({'fillOpacity': 0.4});
      });
   }
   updateView() {
      if (this.isComplete()) {
         this.elem.addClass('completed');
      }
      $(".num", this.elem).text(this.getRatioText());
      if (selectedRegion === this) {
         $(".info .num").text(this.getRatioText());
      }
   }
}
Region.byName = {};

const ALL = new Region("World", [[-56, -218], [66, 179]]);
const regions = [
   new Region("North America", [[6, -135], [55, -60]]),
   new Region("South America", [[-45, -84], [13, -34]]),
   new Region("Europe", [[33, -18], [66, 44]]),
   new Region("Asia", [[-12, 32], [55, 148]]),
   new Region("Africa", [[-35, -20], [38, 53]]),
   new Region("Oceania", [[-50, 106], [7, 179]]),
   ALL
];
var selectedRegion = ALL;

var regionsDiv = $("#regions");
regions.forEach(function (r) {
   var rd = $(`<li class="region"><div class="title">${r.name}</div><div class="num">0 / 0</div></li>`);
   regionsDiv.append(rd);
   rd.on('click', function(e) {
      selectRegion(r);
      $("#menu").hide();
   });
   r.elem = rd;
});

function selectRegion(r) {
   map.fitBounds(r.bounds);

   if (selectedRegion && selectedRegion !== r) {
      selectedRegion.elem.removeClass("selected");
      selectedRegion.deactivate();
   }

   selectedRegion = r;
   r.elem.addClass("selected");
   $(".info .title").text(r.name);
   $(".info .num").text(r.getRatioText());

   r.activate();

   $("#nameBox").focus();
}

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

var layer = L.geoJSON(null, {
   onEachFeature: function(feature, layer) {
      if (feature.properties.type == 'Indeterminate') {
         return;
      }

      byName[feature.properties.sovereignt.toLowerCase()] = layer;
      byName[feature.properties.name.toLowerCase()] = layer;
      byName[feature.properties.name_long.toLowerCase()] = layer;

      let region = Region.byName[feature.properties.continent];
      if (!region) {
         region = Region.byName[feature.properties.continent = feature.properties.region_un];
      }

      if (region) {
         region.nations.push(layer);
         ALL.nations.push(layer);

         var sub = region.sub[feature.properties.subregion];
         if (sub == null) {
            region.sub[feature.properties.subregion] = sub = {
               name: feature.properties.subregion,
               found: 0,
               nations: []
            };
         }
         sub.nations.push(layer);
      }
      else {
         console.log("Missing region " + feature.properties.continent);
      }

      feature.hintCount = 0;
      layer.on('click', function(e2) {
         if (feature.hintCount < 3) feature.hintCount++;
         showAlert("That one starts with " + feature.properties.name_long.substr(0, feature.hintCount) + "...");
         $("#nameBox").focus();
      });
      layer.on('mouseover', function(e2) {
         layer.setStyle({'weight': 3});
      });
      layer.on('mouseout', function(e2) {
         layer.setStyle({'weight': null});
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

$.when($.getJSON(MAP_DATA_FILE), $.getJSON(LABEL_DATA_FILE)).done(function(mapData, labelData) {
   layer.addData(mapData[0]);
   layer.addTo(map);

   labelData[0].features.forEach(function(f) {
      if (f.properties.sovereignt == f.properties.admin) {
         centers[f.properties.sovereignt] = f.geometry.coordinates.reverse();
      }
      allByName[f.properties.name.toLowerCase()] = f;
   });

   regions.forEach(r => r.updateView());
   selectedRegion.activate();
   spinner.stop();
});

function completeRegion() {
   regionSound.play();
   if (selectedRegion !== ALL) {
      // Select the next region that has missing countries
      // (but only if we aren't looking at the whole world)
      setTimeout(function() {
         for (let i = 0; i < regions.length; i++) {
            if (!regions[i].isComplete()) {
               selectRegion(regions[i]);
               break;
            }
         }
      }, 1000);
   }
}

var lastTimeout = null;
function showAlert(text, type) {
   let elem = $("#alert");
   elem.text(text).show();
   if (lastTimeout != null) {
      clearTimeout(lastTimeout);
   }
   lastTimeout = setTimeout(function() {
      elem.fadeOut();
      lastTimeout = null;
   }, 5000);
   if (type == 'wrong') {
      wrongSound.play();
   }
}

const MatchResult = Object.freeze({
   MATCH: {},
   OTHER: {},
   NONE: {}
});

function checkName(name) {
   var cleanName = name.trim().toLowerCase();
   var l = byName[cleanName];
   if (!l) {
      // Not a match
      // It might be the name of a constituent country or territory however
      let ct = allByName[cleanName];
      if (ct) {
         let owner = byName[ct.properties.sovereignt.toLowerCase()];
         let ownerName = owner.found ? owner.feature.properties.name_long :
               "another sovereign state";
         showAlert("Sorry, " + ct.properties.name + " is part of " +
               ownerName + ".", 'wrong');
         return MatchResult.OTHER;
      }
      return MatchResult.NONE;
   }

   if (l.found) {
      return MatchResult.NONE;
   }

   var region = Region.byName[l.feature.properties.continent];

   if (selectedRegion !== ALL && region !== selectedRegion) {
      // Not in the current region
      showAlert("Oops, that's not in " + selectedRegion.name + ".", 'wrong');
      return MatchResult.WRONG_REGION;
   }

   l.setStyle({
      fillColor: colors[l.feature.properties.mapcolor7 - 1]
   });
   l.found = true;
   ALL.found++;

   region.found++;
   region.updateView();
   ALL.updateView();

   var sub = region.sub[l.feature.properties.subregion];
   sub.found++;

   showLabel(l.feature);

   if (region.isComplete()) {
      completeRegion();
   }
   else {
      namedSound.play();
   }
   return MatchResult.MATCH;
}

var box = $("#nameBox");
box.on('input', function(e) {
   let result = checkName(box.val());
   if (result != MatchResult.NONE) {
      box.val('');
      let cls = (result == MatchResult.MATCH ? 'correct' : 'wrong');
      flashBox(cls);
   }
});
box.on('keypress', function(e) {
   $("#alert").hide();
   if (e.which == 13 && box.val().trim() != "") {
      flashBox('wrong');
   }
   return true;
});

function flashBox(cls) {
   box.addClass(cls);
   setTimeout(function(){
      box.removeClass(cls);
   }, 100);
}

function showHint() {
   for (let i = 0; i < selectedRegion.nations.length; i++) {
      let n = selectedRegion.nations[i];
      if (!n.found) {
         showAlert("You're missing one that starts with " + n.feature.properties.name_long[0]);
         $("#nameBox").focus();
         break;
      }
   }
}

var regionsCollapsed = false;
var showSize = -1;

function updateSize() {
   let r = $("#regions")[0];
   if (r.scrollHeight > r.clientHeight || r.offsetWidth < r.scrollWidth) {
      // Window is too small to show all the region buttons
      if (!regionsCollapsed) {
         var diff = r.scrollWidth - r.offsetWidth;
         $(r).hide();
         // Move them to the menu
         $(".region").appendTo("#menu");
         $("#small").show();
         regionsCollapsed = true;
         // Calculate width required to fit everything
         showSize = window.innerWidth + diff;
      }
   }
   else if (window.innerWidth > showSize && regionsCollapsed) {
      // Move the region buttons back to the bar
      $(".region").appendTo("#regions");
      $(r).show();
      $("#small").hide();
      regionsCollapsed = false;
   }
}

$(function() {
   selectRegion(regions[0]);
   $("#nameBox").focus();
   $("#hintlink").on('click', function(e) {
      $("#menu").hide();
      showHint();
      return false;
   });
   $("#alert").css({
      top: (box.offset().top + box.height() + 18) + 'px',
      left: box.offset().left + 'px'
   });
   updateSize();

   $(".menuBtn").on('click', function() {
      $("#menu").toggle();
   });
});

$(window).resize(updateSize);