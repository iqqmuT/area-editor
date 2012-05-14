/*
 * Copyright 2012 Arno Teigseth, Tuomas Jaakola
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
 * Leaflet integration file of TOE.
 * 
 */

toe.map = {

  init: function() {
    var mapOptions = {
      doubleClickZoom: false,
      touchZoom: true
    };
    this.map = new L.Map('map_canvas', mapOptions);
    var cloudmade = new L.TileLayer('http://{s}.tile.cloudmade.com/f32e8bf95a994abf9d647adc983a33a5/997/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
    });
    var lastView = toe._loadBounds();
    if (lastView !== false) {
      this.map.fitBounds(lastView);
    }

    //var london = new L.LatLng(51.505, -0.09); // geographical point (longitude and latitude)
    //var pori = new L.LatLng(61.483617, 21.7962775);
    //this.map.setView(pori, 13)
    this.map.addLayer(cloudmade);

    this.map.addControl(new L.Control.MapMode());
    this.map.addControl(new L.Control.Tools());
    /*
    console.log("rock rock");

    var center = new google.maps.LatLng(61.483617, 21.7962775);
    var mapOptions = {
      zoom: 16,
      center: center,
      mapTypeId: 'OSM',
      mapTypeControlOptions: {
        mapTypeIds: ['OSM', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN ],
        //style: google.maps.MapTypeControlStyle.DEFAULT
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
      },
      disableDefaultUI: false,
      scaleControl: false,
      disableDoubleClickZoom: true,
    };

    // set OpenStreetMap map type as default  
    var osm_map_type = new google.maps.ImageMapType({
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
    this.map.mapTypes.set('OSM', osm_map_type);
    this.map.setMapTypeId('OSM');

    var $mode_div = toe.control.Mode.html();
    this.map.controls[google.maps.ControlPosition.TOP_CENTER].push($mode_div[0]);

    var $tools_div = toe.control.Tools.html();
    this.map.controls[google.maps.ControlPosition.RIGHT].push($tools_div[0]);

    var $help_div = $('<div id="help_link"><a href="javascript:toe.dialog.Help.open()" style="color: #000;">' + tr("Help") + '</a></div>');
    this.map.controls[google.maps.ControlPosition.RIGHT].push($help_div[0]);

    // create the div to hold our custom controls
    //var $control_div = $("<div></div>");
    //$control_div.css({ 'margin': '5px',
    //                   'border': '2px solid black' });
    //$control_div.append(this.control.Area.html());
    //$control_div.append(this.control.Poi.html());
    //toe.map.controls[google.maps.ControlPosition.RIGHT].push($control_div[0]);

    // our controls
    //$menu_div = this.control.Menu.html();
    //toe.map.controls[google.maps.ControlPosition.RIGHT].push($menu_div[0]);

    // add click listeners to the map
    google.maps.event.addListener(this.map, 'click', function(event) { toe.handler.mapClicked(event); });
    google.maps.event.addListener(this.map, 'dblclick', function(event) { toe.handler.mapDoubleClicked(event); });

    // dummy overlay, we will use this for converting 
    overlay = new google.maps.OverlayView();
    overlay.draw = function () {};
    overlay.setMap(this.map);
    */

    // add click listeners to the map
    this.map.on('click', function(event) { toe.handler.mapClicked(event); });
    this.map.on('dblclick', function(event) { toe.handler.mapDoubleClicked(event); });

    // initialize info window, there is just one window here
    this.infoWindow = new toe.map.InfoWindow();
  },

  changeDragMode: function() {
    this.map._container.style.cursor = '';
  },

  changeAreaMode: function() {
    this.map._container.style.cursor = 'crosshair';
  },

  /**
   * Fit map to given bounds, or if not given, gets bounds of all stuff we have on the map and zoom the map there
   */
  fitBounds: function(bounds) {
    if (!bounds)
    {
      bounds = new this.LatLngBounds();
      if (toe.AreaManager.areas.length) {
        bounds.union(toe.AreaManager.getBounds());
      }
      /*
      console.log(bounds);
      if (toe.PoiManager.pois.length) {
        bounds.union(toe.PoiManager.getBounds());
      }*/
    }
    //console.log(bounds, pois.getBounds());
    //console.log(bounds.isEmpty());
    if (!bounds.isEmpty()) {
      //console.log("fit bounds?", bounds, bounds.isEmpty());
      this.map.fitBounds(bounds);
    }
  },

  getBounds: function() {
    return this._toBounds(toe.map.map.getBounds());
  },

  /**
   * Returns toe.map.LatLng from (click) event.
   */
  getEventLatLng: function(event) {
    return this._toLatLng(event.latlng);
  },

  /**
   * Converts Leaflet LatLngBounds object to toe.map.LatLngBounds.
   * Private function.
   */
  _toBounds: function(leafletLatLngBounds) {
    return new toe.map.LatLngBounds(leafletLatLngBounds.getSouthWest(), leafletLatLngBounds.getNorthEast());
  },

  /**
   * Converts Leaflet LatLngBounds object to toe.map.LatLngBounds.
   * Private function.
   */
  _toLatLng: function(leafletLatLng) {
    return new toe.map.LatLng(leafletLatLng.lat, leafletLatLng.lng);
  }

};

/**
 * InfoWindow
 */
toe.map.InfoWindow = function() {
    this.base = L.Popup;
    this.base();
};

toe.map.InfoWindow.prototype = new L.Popup;

toe.map.InfoWindow.prototype.show = function(options) {
  this.on('contentupdate', options.ready);
  this.setContent(options.content);
  this.setLatLng(options.position);
  toe.map.map.openPopup(this);
};

toe.map.InfoWindow.prototype.hide = function() {
  toe.map.map.removeLayer(this);
};

/**
 * LatLng
 */
toe.map.LatLng = function(lat, lng) {
  this.base = L.LatLng;
  this.base(lat, lng);
};
// use hackish inheritance
// http://www.spheredev.org/wiki/Prototypes_in_JavaScript
toe.map.LatLng.prototype.__proto__ = L.LatLng.prototype;

// returns latLng as JSON array
toe.map.LatLng.prototype.toJSON = function() {
  return "[" + this.lat + "," + this.lng + "]";
};

toe.map.LatLng.prototype.getLat = function() {
  return this.lat;
};

toe.map.LatLng.prototype.getLng = function() {
  return this.lng;
};

/**
 * Converts LatLng to pixel point.
 */
toe.map.LatLng.prototype.toPoint = function() {
  return toe.map.map.latLngToLayerPoint(this);
};

toe.map.LatLng.prototype.toString = function() {
  return ('(' + this.lat + ', ' + this.lng + ')');
};


/**
 * LatLngBounds
 */
toe.map.LatLngBounds = function(sw, ne) {
  this.base = L.LatLngBounds;
  this.base(sw, ne);
};
toe.map.LatLngBounds.prototype = new L.LatLngBounds;

// Resizes LatLngBounds with given factor
toe.map.LatLngBounds.prototype.resize = function(factor) {
  var ne = this.getNorthEast();
  var sw = this.getSouthWest();
  var ce = this.getCenter();

  var lat = ce.lat - (factor * (ce.lat - ne.lat));
  var lng = ce.lng - (factor * (ce.lng - ne.lng));
  ne = new toe.map.LatLng(lat, lng);

  lat = ce.lat + (factor * (sw.lat - ce.lat));
  lng = ce.lng + (factor * (sw.lng - ce.lng));
  sw = new toe.map.LatLng(lat, lng);

  return new toe.map.LatLngBounds(sw, ne);
};

/**
 * Extends this bounds to contain the union of this and the given bounds.
 **/
toe.map.LatLngBounds.prototype.union = function(other) {
  this.extend(other.getSouthWest());
  this.extend(other.getNorthEast());
};

toe.map.LatLngBounds.prototype.isEmpty = function() {
  return (this.getNorthEast().lat === undefined);
};

toe.map.LatLngBounds.prototype.toString = function() {
  var sw = toe.map._toLatLng(this.getSouthWest());
  var ne = toe.map._toLatLng(this.getNorthEast());
  return ('(' + sw.toString() + ', ' + ne.toString() + ')');
};

/**
 * Creates LatLngBounds from string which is in format of LatLngBounds.toString()
 */
toe.map.getLatLngBoundsByString = function(str) {
  var nums = str.match(/-?\d[\.\d]*/g);
  var sw = new toe.map.LatLng(nums[0], nums[1]);
  var ne = new toe.map.LatLng(nums[2], nums[3]);
  return new toe.map.LatLngBounds(sw, ne);
};

/**
 * Polygon
 */
toe.map.Polygon = function(options) {
  this.base = L.Polygon;
  this.base(options.paths);
  //console.log("paths: ", options.paths);
  this.on('click', options.clicked);
  this.on('dblclick', options.dblclicked);
};
toe.map.Polygon.prototype = new L.Polygon;

toe.map.Polygon.prototype.show = function() {
  toe.map.map.addLayer(this);
};

toe.map.Polygon.prototype.hide = function() {
  toe.map.map.removeLayer(this);
};

toe.map.Polygon.prototype.setColor = function(style) {
  this.setStyle({
    stroke: true,
    color: style.strokeColor,
    weight: style.strokeWeight,
    opacity: style.strokeOpacity,
    fillColor: style.fillColor,
    fillOpacity: style.fillOpacity
  });
};

/**
 * Add given latlng to path into given position in path.
 */
toe.map.Polygon.prototype.addToPath = function(idx, latLng) {
  this.spliceLatLngs(idx, 0, latLng);
};

/**
 * Remove latlng from path.
 */
toe.map.Polygon.prototype.removeFromPath = function(latLng) {
  var path = this.getLatLngs();
  for (var i = 0; i < path.length; i++) {
    if (path[i].equals(latLng)) {
      this.spliceLatLngs(i, 1); // update polygon path
      return true;
    }
  }
  return false; // given latLng not found
};

/**
 * Move latlng to another location in path.
 */
toe.map.Polygon.prototype.changePath = function(oldLatLng, newLatLng) {
  var path = this.getLatLngs();
  for (var i = 0; i < path.length; i++) {
    if (path[i].equals(oldLatLng)) {
      this.spliceLatLngs(i, 1, newLatLng); // update polygon path
      return true;
    }
  }
  return false; // given latLng not found
};

// Poygon getBounds extension - google-maps-extensions
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
toe.map.Polygon.prototype.getBounds = function() {
  return new L.LatLngBounds(this.getLatLngs());
/*
  var paths = this.getPaths();
  var path;

  for (var p = 0; p < paths.getLength(); p++) {
    path = paths.getAt(p);
    for (var i = 0; i < path.getLength(); i++) {
      bounds.extend(path.getAt(i));
    }
  }
*/
  return bounds;
};

// Polygon containsLatLng - method to determine if a latLng is within a polygon
toe.map.Polygon.prototype.containsLatLng = function(latLng) {
  // Exclude points outside of bounds as there is no way they are in the poly
  var bounds = this.getBounds();

  if(bounds != null && !bounds.contains(latLng)) {
    return false;
  }

  // Raycast point in polygon method
  var inPoly = false;

  var numPaths = this.getPaths().getLength();
  for(var p = 0; p < numPaths; p++) {
    var path = this.getPaths().getAt(p);
    var numPoints = path.getLength();
    var j = numPoints-1;

    for(var i=0; i < numPoints; i++) { 
      var vertex1 = path.getAt(i);
      var vertex2 = path.getAt(j);

      if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng())  {
        if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
          inPoly = !inPoly;
        }
      }

      j = i;
    }
  }

  return inPoly;
};

toe.map.Polygon.prototype.getToePath = function() {
  return this.getLatLngs();
};

/**
 * Rectangle
 */
toe.map.Rectangle = function(options) {
  this.base = L.Rectangle;
  var bounds = toe.map.map.getBounds();
  this.base(bounds);
};
toe.map.Rectangle.prototype.__proto__ = L.Rectangle.prototype;

toe.map.Rectangle.prototype.show = function(bounds) {
  toe.map.map.addLayer(this);
  this.setBounds(bounds);
};
toe.map.Rectangle.prototype.hide = function() {
  toe.map.map.removeLayer(this);
};


/**
 * AreaBorderMarker
 */

toe.map.AreaBorderMarker = function(options) {
  var icon = new L.Icon({
    iconUrl: 'images/red_dot.png',
    shadowUrl: null,
    iconSize: new L.Point(14, 14),
    iconAnchor: new L.Point(7, 7)
  });

  this.base = L.Marker;
  this.base(options.position, {
    icon: icon,
    clickable: true,
    draggable: true
  });
  toe.map.map.addLayer(this);
};

toe.map.AreaBorderMarker.prototype = new L.Marker;

toe.map.AreaBorderMarker.prototype.remove = function() {
  toe.map.map.removeLayer(this);
};

toe.map.AreaBorderMarker.prototype.setDrag = function(func) {
  this.on('drag', func);
};

toe.map.AreaBorderMarker.prototype.setDragEnd = function(func) {
  this.on('dragend', func);
};

toe.map.AreaBorderMarker.prototype.setDoubleClick = function(func) {
  this.on('dblclick', func);
};

toe.map.AreaBorderMarker.prototype.getToeLatLng = function() {
  return toe.map._toLatLng(this.getLatLng());
};

toe.map.AreaBorderMarker.prototype.setToeLatLng = function(latLng) {
  this.setLatLng(latLng);
};

L.Control.MapMode = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function (map) {
    var div = toe.control.Mode.html();
    return div[0];
  }
});

L.Control.Tools = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function (map) {
    var div = toe.control.Tools.html();
    return div[0];
  }
});
