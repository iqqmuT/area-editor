/*
 * Copyright 2011 Arno Teigseth, Tuomas Jaakola
 * 
 * This file is part of TOE.
 *
 * TOE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TOE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TOE.  If not, see <http://www.gnu.org/licenses/>.
 *
 * JavaScript for TOE, functionalities for print page.
 * 
 * Requirements:
 *  - Google Maps JavaScript API v3
 *  - jQuery 1.4.x
 * 
 */

// Global variables
var map;
var osm_map_type;
var areas = [];
var pois = [];

// create safe wrappers for console.log
if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

function initialize(center, zoom, map_type) {

  osm_map_type = new google.maps.ImageMapType({
    getTileUrl: function(coord, zoom) {
		return "http://tile.openstreetmap.org/" +
		zoom + "/" + coord.x + "/" + coord.y + ".png";
	},
	tileSize: new google.maps.Size(256, 256),
	isPng: true,
	alt: "OpenStreetMap layer",
	name: "OSM",
	maxZoom: 19
  });

  var latlng = new google.maps.LatLng(0, 0);
  var mapOptions = {
    zoom: zoom,
    center: center,
    mapTypeId: 'OSM',
    mapTypeControlOptions: {
      mapTypeIds: ['OSM', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID,
        google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN ],
      style: google.maps.MapTypeControlStyle.DEFAULT
    },
    disableDefaultUI: true,
    navigationControl: true,
    mapTypeControl: true
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
  
  // set OpenStreetMap map type as default  
  map.mapTypes.set('OSM', osm_map_type);
  map.setMapTypeId(map_type);
  
  importAreas();
  importPois();
  
  // automatically fit all stuff to our map
  var bounds = getBounds();
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

// return bounds of all stuff we have on map, areas + pois
function getBounds() {
  var bounds = new google.maps.LatLngBounds();
  var i;
  for (i in pois) {
    bounds.extend(pois[i].getPosition());
  }
  for (i in areas) {
    bounds.union(areas[i].getBounds());
  }
  return bounds;
}

// there should be global variables areas_data and pois_data, created in print.php
function importAreas() {
  console.log("importing " + areas_data.length + " areas...");
  for (var i in areas_data) {
    var data = areas_data[i];
    var path = [];
    for (var j in data.path) {
      path.push(new google.maps.LatLng(data.path[j][0], data.path[j][1]));
    }
    // now path should be array of LatLngs
    var area = new google.maps.Polygon({
      paths: path,
      clickable: false,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map: map,
      fillOpacity: 0
    });
    areas.push(area);
  }
}

function importPois() {
  console.log("importing " + pois_data.length + " POIs...");
  var c = 0;
  for (var i in pois_data) {
    c++;
    var data = pois_data[i];
    var label = "" + c;
    var poi = new google.maps.Marker({
      position: new google.maps.LatLng(data.latLng[0], data.latLng[1]),
      clickable: false,
      draggable: false,
      title: label,
      map: map,
      icon: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + label + "|ff776b|000000"
    });
    pois.push(poi);
  }
}

// Poygon getBounds extension - google-maps-extensions
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
if (!google.maps.Polygon.prototype.getBounds) {
  google.maps.Polygon.prototype.getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    var paths = this.getPaths();
    var path;
    
    for (var p = 0; p < paths.getLength(); p++) {
      path = paths.getAt(p);
      for (var i = 0; i < path.getLength(); i++) {
        bounds.extend(path.getAt(i));
      }
    }

    return bounds;
  }
}
