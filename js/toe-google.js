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
 * Google Maps integration file of TOE.
 * 
 */

toe.map = {

  init: function() {
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
    this.map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

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

    // initialize info window, there is just one window here
    this.infoWindow = new toe.map.InfoWindow({});
  },

  // gets bounds of all stuff we have on the map and zoom the map there
  fitBounds: function() {
    var bounds = new this.LatLngBounds();
    if (toe.AreaManager.areas.length) {
      bounds.union(toe.AreaManager.getBounds());
    }
    /*
    console.log(bounds);
    if (toe.PoiManager.pois.length) {
      bounds.union(toe.PoiManager.getBounds());
    }*/
    //console.log(bounds, pois.getBounds());
    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds);
    }
  },

  getBounds: function() {
    return this._toBounds(toe.map.map.getBounds());
  },

  /**
   * Converts Google Maps LatLngBounds object to toe.map.LatLngBounds.
   * Private function.
   */
  _toBounds: function(googleLatLngBounds) {
    return new toe.map.LatLngBounds(googleLatLngBounds.getSouthWest(), googleLatLngBounds.getNorthEast());
  },

  /**
   * Converts Google Maps LatLngBounds object to toe.map.LatLngBounds.
   * Private function.
   */
  _toLatLng: function(googleLatLng) {
    return new toe.map.LatLng(googleLatLng.lat(), googleLatLng.lng());
  }

};

/**
 * InfoWindow
 */
toe.map.InfoWindow = function(options) {
    this.base = google.maps.InfoWindow;
    this.base(options);
};

toe.map.InfoWindow.prototype = new google.maps.InfoWindow;

toe.map.InfoWindow.prototype.show = function(options) {
  this.setOptions({
    content: options.content,
    position: options.position
  });
  this.open(toe.map.map);

  // callback when ready
  google.maps.event.addListener(this, 'domready', function() {
    options.ready();
  });
};

/**
 * LatLng
 */
toe.map.LatLng = function(lat, lng) {
  this.base = google.maps.LatLng;
  this.base(lat, lng);
};
toe.map.LatLng.prototype = new google.maps.LatLng;

// returns latLng as JSON array
toe.map.LatLng.prototype.toJSON = function() {
  return "[" + this.lat() + "," + this.lng() + "]";
};

/**
 * LatLngBounds
 */
toe.map.LatLngBounds = function(sw, ne) {
  this.base = google.maps.LatLngBounds;
  this.base(sw, ne);
};
toe.map.LatLngBounds.prototype = new google.maps.LatLngBounds;

// Resizes LatLngBounds with given factor
toe.map.LatLngBounds.prototype.resize = function(factor) {
  var ne = this.getNorthEast();
  var sw = this.getSouthWest();
  var ce = this.getCenter();

  var lat = ce.lat() - (factor * (ce.lat() - ne.lat()));
  var lng = ce.lng() - (factor * (ce.lng() - ne.lng()));
  ne = new toe.map.LatLng(lat, lng);

  lat = ce.lat() + (factor * (sw.lat() - ce.lat()));
  lng = ce.lng() + (factor * (sw.lng() - ce.lng()));
  sw = new toe.map.LatLng(lat, lng);

  return new toe.map.LatLngBounds(sw, ne);
};

/**
 * Polygon
 */
toe.map.Polygon = function(options) {
  this.base = google.maps.Polygon;
  this.base(options);

  // add click listener to polygon
  google.maps.event.addListener(this, 'click', options.clicked);
  google.maps.event.addListener(this, 'dblclick', options.dblclicked);
};
toe.map.Polygon.prototype = new google.maps.Polygon;

toe.map.Polygon.prototype.show = function() {
  this.setMap(toe.map.map);
};

toe.map.Polygon.prototype.hide = function() {
  this.setMap(null);
};

// Poygon getBounds extension - google-maps-extensions
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
toe.map.Polygon.prototype.getBounds = function() {
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
}

/**
 * Rectangle
 */
toe.map.Rectangle = function(options) {
  this.base = google.maps.Rectangle;
  this.base(options);
};
toe.map.Rectangle.prototype = new google.maps.Rectangle;

toe.map.Rectangle.prototype.show = function(bounds) {
  this.setMap(toe.map.map);
  this.setBounds(bounds);
};
toe.map.Rectangle.prototype.hide = function() {
  this.setMap(null);
};


/**
 * AreaBorderMarker
 */
toe.map.AreaBorderMarker = function(options) {
    options.map = toe.map.map;
    options.draggable = true;
    options.icon = new google.maps.MarkerImage('images/red_dot.png',
      new google.maps.Size(14, 14), // icon size
      new google.maps.Point(0,0),   // origin
      new google.maps.Point(7, 7)); // anchor
    options.shape = {
      coord: [1, 1, 1, 14, 14, 14, 14 , 1],
      type: 'poly'
    };
    options.raiseOnDrag = false;
    options.cursor = 'move';

    this.base = google.maps.Marker;
    this.base(options);
};

toe.map.AreaBorderMarker.prototype = new google.maps.Marker;

toe.map.AreaBorderMarker.prototype.remove = function() {
  this.setMap(null);
};
toe.map.AreaBorderMarker.prototype.setDrag = function(func) {
  google.maps.event.addListener(this, 'drag', func);
};

toe.map.AreaBorderMarker.prototype.setDragEnd = function(func) {
  google.maps.event.addListener(this, 'dragend', func);
};

toe.map.AreaBorderMarker.prototype.setDoubleClick = function(func) {
  google.maps.event.addListener(this, 'dblclick', func);
};
