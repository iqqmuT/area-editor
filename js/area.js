/*
 * JavaScript for online area editor
 * 
 * Requirements:
 *  - Google Maps JavaScript API v3
 *  - jQuery 1.4.x
 * 
 */

// Global variables
var map;
var osm_map_type;
var areas = new AreaManager();
var shift_is_down = false;
var ctrl_is_down = false;
var alt_is_down = false;
var overlay; // used for converting latlng -> point
var boundaries = new BoundaryManager();
var info_window; // there's only one info_window
var pois = new PoiManager();
var area_control; // control for areas
var poi_control; // control for POIs
var osm_control; // control for Openstreetmap layer
var menu_control; // control for file (import / export) operations

if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

function initialize() {

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

  //var latlng = new google.maps.LatLng(-0.320662, -78.517540);
  var latlng = new google.maps.LatLng(0, 0);
  var mapOptions = {
    zoom: 3,
    center: latlng,
    mapTypeId: 'OSM',
    mapTypeControlOptions: {
      mapTypeIds: ['OSM', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID,
        google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN ],
      style: google.maps.MapTypeControlStyle.DEFAULT
    },
    disableDefaultUI: false,
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

  // set OpenStreetMap map type as default  
  map.mapTypes.set('OSM', osm_map_type);
  map.setMapTypeId('OSM');

  // create the div to hold our custom controls
  var $control_div = $("<div></div>");
  $control_div.css({ 'margin': '5px',
                     'border': '2px solid black' });
  area_control = new AreaControl($control_div, true, true);
  poi_control = new PoiControl($control_div, true, false);
  map.controls[google.maps.ControlPosition.RIGHT].push($control_div[0]);

  // our controls
  menu_control = new MenuControl();

  // add key listeners to the whole document, to see if shift, ctrl or alt is pressed
  google.maps.event.addDomListener(document, 'keydown', onKeyDown);
  google.maps.event.addDomListener(document, 'keyup', onKeyUp);

  // add click listener to the map
  google.maps.event.addListener(map, 'click', function(event) { mapClicked(event); });
  //map.getProjection().fromLatLngToPoint(c);
  //google.maps.event.addListener(map, 'mousemove', function(event) { console.log("mousemove: ", event.pixel.x, event.pixel.y); });

  // dummy overlay, we will use this for converting 
  overlay = new google.maps.OverlayView();
  overlay.draw = function () {};
  overlay.setMap(map);
  
  // initialize info window, there is just one window here
  info_window = new google.maps.InfoWindow({});
  
  // initialize file dialog, and open the dialog in initialize
  initializeFileDialogs(true);
}

function initializeFileDialogs(autoOpen) {  
  // initialize file dialogs
  $("#file_open_dialog").dialog({ 'title': '<span class="ui-icon ui-icon-folder-open" style="float:left; margin-right: 5px;"></span>Open file',
                                  'width': '300px',
				  'autoOpen': autoOpen,
			          'resizable': false });
  $("#file_save_dialog").dialog({ 'title': '<span class="ui-icon ui-icon-arrowthickstop-1-s" style="float:left; margin-right: 5px;"></span>Save file',
                                  'width': '300px',
				  'autoOpen': false,
			          'resizable': false });
  $("#help_dialog").dialog({ 'title': '<span class="ui-icon ui-icon-help" style="float:left; margin-right: 5px;"></span>Help',
                                  'width': '500px',
				  'autoOpen': false,
			          'resizable': false });
  $("#open_button").button();
  $("#save_button").button();
  
  $("#export_form").submit(exportFile);
}

  // in export form submit, send values as JSON to server
function exportFile() {
  console.log("exporting...");
  $("#pois_json").val(pois.toJSON());
  $("#areas_json").val(areas.toJSON());
  $("#file_save_dialog").dialog('close');
  return true;
}

// control for importing / exporting files
function MenuControl() {
  var obj = this;
  var $div = $('<div></div>');
  $div.css({ 'cursor': 'pointer',
            'margin': '5px',
	    'width': '95px',
            'font-family': 'Arial,sans-serif',
            'font-size': '12px',
	    'text-align': 'center',
	    'background-color': 'white',
	    'border': '2px solid black'
  });
  var $file_ui = $('<div id="file_button" style="padding-left: 30px" title="Click to open / close menu"><span style="float:left">Menu</span><span id="file_button_icon" class="ui-icon ui-icon-triangle-1-s" style="float: left;"></span><div style="clear:both"></div></div>');
  $div.append($file_ui);
  $menu_div = $('<div id="file_menu"></div>');
  $menu_div.css({ 'display': 'none' });
  $div.append($menu_div);
  var $open_file_ui = $('<div id="open_file_button" class="file_menu_item" title="Import data from file">Open file...</div>');
  $menu_div.append($open_file_ui);
  var $save_file_ui = $('<div id="save_file_button" class="file_menu_item" title="Export data into file">Save file...</div>');
  $menu_div.append($save_file_ui);
  var $print_ui = $('<div id="print_button" class="file_menu_item">Print</div>');
  $menu_div.append($print_ui);
  var $help_ui = $('<div id="help_button" class="file_menu_item">Help</div>');
  $menu_div.append($help_ui);
  
  $file_ui.click(function() {
    // when user clicks 'File' it gives the dropdown menu
    if ($("#file_menu:visible").length) {
      $("#file_menu").slideUp();
      $("#file_button_icon").removeClass('ui-icon-triangle-1-n').addClass('ui-icon-triangle-1-s');
    } else {
      $("#file_menu").slideDown();
      $("#file_button_icon").removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-n');
    }
  });
  $open_file_ui.click(function() {
    $("#file_open_dialog").dialog('open');
  });
  $save_file_ui.click(function() {
    $("#file_save_dialog").dialog('open');
  });
  $print_ui.click(function() {
    openPrintablePage();
  });
  $help_ui.click(function() {
    $("#help_dialog").dialog('open');
  });
  
  map.controls[google.maps.ControlPosition.RIGHT].push($div[0]);
}

function AreaControl($div, visible, editable) {
  this.visible = visible;
  this.editable = editable;
  var obj = this;

  var css_editable = { 'background-color': 'rgb(240, 240, 240)',
                      'font-weight': 'bold' };
  var css_readonly = { 'background-color': 'white',
                       'font-weight': 'normal' };
  var css_visible = { 'opacity': '1' };
  var css_invisible = { 'opacity': '0.1' };

  var $ui = $('<div title="Click to edit layer">Area</div>');
  $ui.css({ 'cursor': 'pointer',
	    'width': '95px',
            'font-family': 'Arial,sans-serif',
            'font-size': '12px',
	    'text-align': 'right',
	    'padding-right': '2px',
	    'height': '15px'
	    });
  if (this.editable) {
    $ui.css(css_editable);
  } else {
    $ui.css(css_readonly);
  }
  $div.append($ui);
  
  var $visible_ui = $('<div title="Click to toggle visiblity"><img src="images/stock-eye-20.png" alt="x" style="margin-top: 3px" /></div>');
  $visible_ui.css({ 'float': 'left',
                    'padding-left': '4px',
		    'padding-right': '4px' });
  
  $ui.append($visible_ui);

  $ui.click(function() {
    obj.toggle_editable();
    poi_control.toggle_editable();
  });
  $visible_ui.click(function(event) {
    obj.toggle_visible();
    event.stopPropagation();
  });
  
  this.toggle_visible = function() {
    console.log("AreaControl.toggle_visible()");
    if (this.visible) {
      this.visible = false;
      $visible_ui.css(css_invisible);
      areas.hide();
    } else {
      this.visible = true;
      $visible_ui.css(css_visible);
      areas.show();
    }
  };
  
  this.toggle_editable = function() {
    console.log("AreaControl.toggle_editable()");
    if (this.editable) {
      this.editable = false;
      $ui.css(css_readonly);
      areas.deactivate();
      areas.setClickable(false);
    } else {
      if (!this.visible) {
        // automatically enable visibility, if we are editable
        this.toggle_visible();
      }
      this.editable = true;
      $ui.css(css_editable);
      areas.setClickable(true);
    }
  };
}

function PoiControl($div, visible, editable) {
  this.visible = visible;
  this.editable = editable;
  var obj = this;

  var css_editable = { 'background-color': 'rgb(240, 240, 240)',
                      'font-weight': 'bold' };
  var css_readonly = { 'background-color': 'white',
                       'font-weight': 'normal' };
  var css_visible = { 'opacity': '1' };
  var css_invisible = { 'opacity': '0.1' };

  var $ui = $('<div title="Click to edit layer">POI</div>');
  $ui.css({ 'cursor': 'pointer',
	    'width': '95px',
            'font-family': 'Arial,sans-serif',
            'font-size': '12px',
	    'text-align': 'right',
	    'padding-right': '2px',
	    'height': '15px'
	    });
  if (this.editable) {
    $ui.css(css_editable);
  } else {
    $ui.css(css_readonly);
  }
  $div.append($ui);
  
  var $visible_ui = $('<div title="Click to toggle visibility"><img src="images/stock-eye-20.png" alt="x" style="margin-top: 3px" /></div>');
  $visible_ui.css({ 'float': 'left',
                    'padding-left': '4px',
		    'padding-right': '4px' });
  
  $ui.prepend($visible_ui);

  $ui.click(function() {
    obj.toggle_editable();
    area_control.toggle_editable();
  });
  $visible_ui.click(function(event) {
    obj.toggle_visible();
    event.stopPropagation();
  });
  
  this.toggle_visible = function() {
    console.log("PoiControl.toggle_visible()");
    if (this.visible) {
      this.visible = false;
      $visible_ui.css(css_invisible);
      pois.hide();
    } else {
      this.visible = true;
      $visible_ui.css(css_visible);
      pois.show();
    }
  };
  
  this.toggle_editable = function() {
    console.log("PoiControl.toggle_editable()");
    if (this.editable) {
      this.editable = false;
      $ui.css(css_readonly);
      pois.setDraggable(false);
    } else {
      if (!this.visible) {
        // automatically enable visibility, if we are editable
        this.toggle_visible();
      }
      this.editable = true;
      $ui.css(css_editable);
      pois.setDraggable(true);
    }
  };
}

function openPrintablePage() {
  var $print_form = $('<form target="print_window" action="print.php" method="post"><input type="hidden" name="foo" value="bar" /></form>');
  $print_form.append('<input type="hidden" name="map-type" value="' + map.getMapTypeId() + '" />');
  $("body").append($print_form);
  var printable_page = window.open('about:blank', 'print_window', "status=1,toolbar=1,location=1,scrollbars=1,menubar=1,width=900,height=700");
  $print_form.submit().remove();
}

function determineKey(e) {
  e = e || window.event;
  if (e.shiftKey) return 'shift';
  if (e.ctrlKey) return 'ctrl';
  if (e.altKey) return 'alt';
  // Need to look at keyCode for Opera because it
  // doesn't set the shiftKey, altKey, ctrlKey properties
  // unless a non-modifier event is being reported.
  //
  // See http://cross-browser.com/x/examples/shift_mode.php
  // Also see http://unixpapa.com/js/key.html
  switch (e.keyCode) {
    case 16:
      return 'shift';
    case 17:
      return 'ctrl';
    case 18:
      return 'alt';
    case 46:
      return 'del';
  }
  return 'other';
}

function onKeyDown(e) {
  //console.log("key down: ", e);
  var key = determineKey(e);
  if (key == 'shift') shift_is_down = true;
  if (key == 'ctrl') ctrl_is_down = true;
  if (key == 'alt') alt_is_down = true;
  if (key == 'del' && areas.active_area) {
    var area = areas.active_area;
    area.deactivate();
    areas.remove(area);
  }
}

function onKeyUp(e) {
  //console.log("key up: ", e);
  var key = determineKey(e);
  if (key == 'shift') shift_is_down = false;
  if (key == 'ctrl') ctrl_is_down = false;
  if (key == 'alt') alt_is_down = false;
}

function mapClicked(event) {
  if (area_control.editable) {
    // event when areas are editable
    if (shift_is_down) {
      if (areas.active_area) {
        console.log("ADD TO AREA ", areas.active_area);
        areas.active_area.addNewBorder(event);
      } else {
        // create a new area
        console.log("CREATE NEW AREA!");
        var area = new Area(areas.get_new_id(), '', '', [ event.latLng ]);
        areas.add(area);
        area.show();
        area.activate();
      }
    } else {
      // normal click outside areas
      console.log("map clicked.", event);
      areas.deactivate();
    }
  } else if (poi_control.editable) {
    // event when POIs are editable
    if (shift_is_down) {
      console.log("CREATE NEW POI");
      pois.create(event.latLng);
    }
  }
}

function encodeJSON(str) {
  if (!str) return '';
  var encoded = str.replace(/\n/g, "\\n");
  encoded = encoded.replace(/\"/g, "\\\"");
  //encoded = encoded.replace(/\'/g, "\\\'");
  return encoded;
}

function importData(data) {
  console.log("we are importing now!", data);
  var areas_imported = areas.importJSON(data.areas);
  var pois_imported = pois.importJSON(data.pois);
  console.log("areas imported: " + areas_imported);
  console.log("POIs imported: " + pois_imported);
  if (pois_imported || areas_imported) {
    $("#file_open_dialog").dialog('close'); // we can close the dialog now
    fitBounds();
  }
  else {
    // we imported nothing, invalid or empty data file
  }
}

// gets bounds of all stuff we have on the map and zoom the map there
function fitBounds() {
  var bounds = new google.maps.LatLngBounds();
  if (areas.areas.length) {
    bounds.union(areas.getBounds());
  }
  if (pois.pois.length) {
    bounds.union(pois.getBounds());
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

function PoiManager() {
  this.pois = [];
  this.new_id = 1;
  
  this.add = function(poi) {
    this.pois.push(poi);
  };

  this.remove = function(poi) {
    console.log("PoiManager.remove(" + poi.id + ")");
    for (var i = 0; i < this.pois.length; i++) {
      if (this.pois[i] == poi) {
        poi.marker.setMap(null);
        this.pois.splice(i, 1);
	delete poi;
        return true;
      }
    }
    return false;
  };
  
  // shows all POIs
  this.show = function() {
    for (var i in this.pois) {
      this.pois[i].show();
    }
  };
  // hides all POIs
  this.hide = function() {
    for (var i in this.pois) {
      this.pois[i].hide();
    }
  };

  // creates an empty POI with given latLng
  this.create = function(latLng) {  
    var poi = new Poi(this.get_new_id(), '', '', '', latLng);
    this.add(poi);
    poi.show();
  };

  this.get_new_id = function() {
    var time = new Date();
    return "-" + time.getTime();
  };

  // returns POI with given id or null
  this.find_by_id = function(id) {
    for (var i in this.pois) {
      if (this.pois[i].id == id)
        return this.pois[i];
    }
    return null;
  };

  // this function is called when user clicks Save on PoiInfoWindow
  this.saveInfo = function(event) {
    var id = $("#poi_id").val();
    var poi = this.find_by_id(id);
    if (poi) {
      var address = $("#poi_address").val();
      var name = $("#poi_name").val();
      var notes = $("#poi_notes").val();
      poi.address = address;
      poi.name = name;
      poi.notes = notes;
      poi.changed = true;
      info_window.close();
    }
    console.log("poi_id: " + id);
    console.log(event);
    event.stopPropagation();
    return false; // return false so we don't submit the form
  };
  
  // serialize all POIs to JSON
  this.toJSON = function() {
    var json = "[";
    for (var i in this.pois) {
      if (i > 0) {
        json += ",";
      }
      json += this.pois[i].toJSON();
    }
    json += "]";
    return json;
  };
  
  // import POIs from JSON data
  // returns integer of how many POIs imported
  this.importJSON = function(data) {
    var c = 0;
    for (var i in data) {
      var poi = data[i];
      this.add(new Poi(poi.id, '', '', poi.notes, new google.maps.LatLng(poi.latLng[0], poi.latLng[1])));
      c++;
    }
    if (poi_control.visible) {
      pois.show();
    }
    return c;
  };

  // returns bounds of all POIs
  this.getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    for (var i in this.pois) {
      bounds.extend(this.pois[i].latLng);
    }
    return bounds;
  };
  
  this.setDraggable = function(value) {
    for (var i in this.pois) {
      if (this.pois[i].marker) {
        this.pois[i].marker.setDraggable(value);
	this.pois[i].marker.setClickable(value);
      }
    }
  };
  
}

function Poi(id, address, name, notes, latLng) {
  this.id = id;
  this.latLng = latLng;
  this.address = address;
  this.name = name;
  this.notes = notes;
  this.marker;
  this.changed = false;
  var poi = this;
  
  // create a marker for this
  this.show = function() {
    console.log("Poi.showMarker ", this.latLng);
    if (this.marker) {
      // marker already created, just show it again
      this.marker.setMap(map);
    }
    else {
      // first time when we create a marker for this
      var marker = new google.maps.Marker({
        position: this.latLng,
        map: map,
        draggable: true,
        //icon: 'http://google-maps-icons.googlecode.com/files/factory.png',
        title: 'Click to see details'
      });

      // marker drag functionality
      google.maps.event.addListener(marker, 'drag', function(event) {
        // normally drag marker for all areas linked here
        marker.setPosition(event.latLng);
      });
    
      google.maps.event.addListener(marker, 'dragend', function(event) {
        this.latLng = event.latLng;
	poi.changed = true;
      });
      
      google.maps.event.addListener(marker, 'click', function(event) {
        if (poi_control.editable) {
          if (shift_is_down) {
  	    if (confirm("Are you sure you want to delete this POI?")) {
	      console.log('remove this POI');
  	      pois.remove(poi);
	    }
  	    event.preventDefault(); 
	  } else {
	    poi.showInfoWindow();
  	  }
	}
      });
      
      this.marker = marker;
    }
  };

  // hides the marker
  this.hide = function() {
    if (this.marker) {
      this.marker.setMap(null);
    }
  };
  
  this.showInfoWindow = function() {
    console.log("Poi.showInfoWindow()");
    var contentString = '<div class="infowindow"><form action="" method="post">' +
      '<input type="hidden" id="poi_id" value="' + escape(poi.id) + '" />' +
      '<table>' +
//      '<tr><td>Address:</td><td><input type="text" id="poi_address" value="' + poi.address + '" class="field" /></td></tr>' +
//      '<tr><td>Name:</td><td><input type="text" id="poi_name" value="' + poi.name + '" class="field" /></td></tr>' +
      '<tr><td style="vertical-align: top">Notes:</td><td><textarea id="poi_notes" class="area">' + poi.notes + '</textarea></td></tr>' +
      '<tr><td></td><td><input type="submit" id="poi_submit" value="Save" onclick="return pois.saveInfo(event)"/></td></tr>' +
      '</table></form></div>';
    info_window.setOptions({
      content: contentString,
      position: poi.latLng
    });
    info_window.open(map);
  };
  
  this.belongsTo = function() {
  };
  
  // serialize this POI to JSON, for posting POIs to server
  this.toJSON = function() {
    var json = '{';
    json += '"id":"' + this.id + '",';
    json += '"address":"' + encodeJSON(this.address) + '",';
    json += '"name":"' + encodeJSON(this.name) + '",';
    json += '"notes":"' + encodeJSON(this.notes) + '",';
    json += '"latLng":' + this.latLng.toJSON() + '';
    json += '}';
    console.log("export pois: ", json);
    return json;
  };
}

function BoundaryManager() {
  this.boundaries_arr = [];

  // returns boundary by given latLng, or null
  this.find = function(latLng) {
    for (var i = 0; i < this.boundaries_arr.length; i++) {
      if (this.boundaries_arr[i].latLng.equals(latLng))
        return this.boundaries_arr[i];
    }
    return null;
  };
  
  this.add = function(latLng, area) {
    // see if this is already exists in boundaries array
    console.log("BoundaryManager.add(", latLng, area, ")");
    var boundary = this.find(latLng);
    if (!boundary) {
      // create a new boundary
      boundary = new Boundary(latLng);
      this.boundaries_arr.push(boundary);
    }
    // link given area to boundary
    boundary.linkTo(area);
  };
  
  // if area given, remove only given area from boundary
  // else remove whole boundary (remove boundaries that don't belong
  // to any area anyway)
  this.remove = function(latLng, area) {
    console.log("BoundaryManager.remove(", latLng, area, ")");
    var boundary = this.find(latLng);
    if (boundary) {
      boundary.unlink(area);
      if (boundary.empty()) {
        console.log("boundary is EMPTY!");
        // we no longer need this boundary, last link to area was gone
	for (var i = 0; i < this.boundaries_arr.length; i++) {
	  if (this.boundaries_arr[i] == boundary) {
	    this.boundaries_arr.splice(i, 1); // remove this from array
	    delete boundary;
	    return;
	  }
	}
      }
    }
  };

  // returns true if merged two boundaries having same position
  // or false if no merging happened
  this.mergeBoundary = function(boundary) {
    for (var i = 0; i < this.boundaries_arr.length; i++) {
      var other_boundary = this.boundaries_arr[i];
      if (boundary == other_boundary) continue;
      if (boundary.latLng.equals(other_boundary.latLng)) {
        for (var j = 0; j < other_boundary.areas.length; j++) {
	  // copy areas from other boundary
	  boundary.areas.push(other_boundary.areas[j]);
	}
	delete other_boundary; // remove other boundary
        this.boundaries_arr.splice(i, 1);
        return true; // merged 
      }
    }
    return false; // not merged
  };
}

function Boundary(latLng) {
  this.latLng = latLng;
  this.areas = []; // array of areas into which this belongs
  
  // move boundary to given latLng
  // if area is not given, move this boundary for all areas it
  // is assigned to
  this.move = function(latLng, area) {
    for (var i in this.areas) {
      if (!area || (area && this.areas[i] == area)) {
        var path = this.areas[i].polygon.getPath();
	for (var j = 0; j < path.getLength(); j++) {
	  if (path.getAt(j).equals(this.latLng)) {
	    path.setAt(j, latLng); // update polygon path
	    this.areas[i].changed = true;
	    break; // go to next area
	  }
	}
      }
    }
    this.latLng = latLng; //  update our information at last
  }
  
  // add this boundary to a area
  this.linkTo = function(area) {
    // see if this boundary is already linked to given area
    var i = 0;
    for (i = 0; i < this.areas.length; i++) {
      if (this.areas[i] == area)
        break;
    }
    if (i == this.areas.length) {
      // given area was new for this boundary
      this.areas.push(area);
    }
  }
  
  // if area is not given, remove this boundary from all areas
  // it is assigned to
  this.unlink = function(area) {
    console.log("boundary.remove(", area, ")");
    var new_areas = [];
    for (var i in this.areas) {
      if (!area || (area && this.areas[i] == area)) {
        var path = this.areas[i].polygon.getPath();
	for (var j = 0; j < path.getLength(); j++) {
	  if (path.getAt(j).equals(this.latLng)) {
	    path.removeAt(j); // update polygon path
	    this.areas[i].changed = true;
	    break; // go to next area
	  }
	}
      }
      else {
        // preserve this area
        new_areas.push(this.areas[i]);
      }
    }
    // replace areas, now given area should be missing
    // (or all areas)
    this.areas = new_areas;
  }
  
  // returns true if this boundary no longer is used
  this.empty = function() {
    return (this.areas.length == 0);
  }

  this.findNearBoundary = function(range) {
    var point = overlay.getProjection().fromLatLngToContainerPixel(this.latLng);
    for (var i = 0; i < boundaries.boundaries_arr.length; i++) {
      var boundary = boundaries.boundaries_arr[i];
      if (boundary == this) continue; // skip over this
      var boundary_point = overlay.getProjection().fromLatLngToContainerPixel(boundary.latLng);
      if (pointDistance(point, boundary_point) <= range) {
        return boundary;
      }
    }
    return null;
  };
}

function AreaManager() {
  this.active_area;
  this.areas = [];
  this.new_id = 1;
  
  this.add = function(area) {
    this.areas.push(area);
  };
  
  // remove given area
  this.remove = function(area) {
    for (var i = 0; i < this.areas.length; i++) {
      if (this.areas[i] == area) {
        if (confirm('Are you sure you want to delete the area with id ' + area.id + '?')) {
          area.remove();
          this.areas.splice(i, 1);
          return true;
	}
      }
    }
    return false;
  };

  // deactive the active area, if any
  this.deactivate = function() {
    if (this.active_area) {
      this.active_area.deactivate();
    }
  };
  
  // returns area with given id or null
  this.find_by_id = function(id) {
    for (var i in this.areas) {
      if (this.areas[i].id == id)
        return this.areas[i];
    }
    return null;
  };
  
  this.get_new_id = function() {
    var time = new Date();
    return "-" + time.getTime();
    //var new_id = "new" + this.new_id++;
    //return new_id;
  };

  // this function is called when user clicks Save on AreaInfoWindow
  this.saveInfo = function(event) {
    var id = $("#area_id").val();
    var area = areas.find_by_id(id);
    if (area) {
      var number = $("#area_number").val();
      var name = $("#area_name").val();
      area.number = number;
      area.name = name;
      area.changed = true;
      info_window.close();
    }
    console.log("area_id: " + id);
    console.log(event);
    event.stopPropagation();
    return false;
  };
  
  // show all areas
  this.show = function() {
    for (var i in this.areas) {
      this.areas[i].show();
    }
  };
  
  // hide all areas
  this.hide = function() {
    // first deactive any active area
    this.deactivate();
    for (var i in this.areas) {
      this.areas[i].hide();
    }
  };

  // serialize all areas to JSON, this is for sending areas to server
  this.toJSON = function() {
    var json = "[";
    for (var i in this.areas) {
      if (i > 0) {
        json += ",";
      }
      json += this.areas[i].toJSON();
    }
    json += "]";
    console.log("export areas: ", json);
    return json;
  };

  // import areas from JSON data
  // returns integer of how many POIs imported
  this.importJSON = function(data) {
    var c = 0;
    for (var i in data) {
      var area = data[i];
      var path = [];
      var lat;
      var lng;
      for (var j in area.path) {
          lat = area.path[j][0];
          lng = area.path[j][1];
          path.push(new google.maps.LatLng(lat, lng));
      }
      this.add(new Area(area.id, '', '', path));
      c++;
    }
    if (area_control.visible) {
      this.show();
    }
    return c;
  };

  // returns bounds of all areas
  this.getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    for (var i in this.areas) {
      bounds.union(this.areas[i].polygon.getBounds());
    }
    return bounds;
  };

  // sets all areas clickable or not
  this.setClickable = function(value) {
    for (var i in this.pois) {
      if (this.pois[i].marker) {
        this.pois[i].marker.setOptions({ clickable: value });
      }
    }
  };

}

function Area(id, number, name, path) {
  this.id = id;
  this.number = number;
  this.name = name;
  this.edit_mode = false;
  this.changed = false;
  this.border_markers = [];
  this.changed = false;
  
  var area = this;
  
  var activated_options = {
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35
  };
  var deactivated_options = {
    fillColor: "#000000",
    fillOpacity: 0.1,
    strokeColor: "#000000",
    strokeOpacity: 0.8,
    strokeWeight: 1
  };
  
  this.polygon = new google.maps.Polygon({ paths: path });
  this.polygon.setOptions(deactivated_options);
  
  // use boundaries array
  for (var i = 0; i < path.length; i++) {
    var latLng = path[i];
    boundaries.add(latLng, area);
  }
  
  // method functions 
  this.show = function() {
    this.polygon.setMap(map);
  };
  this.hide = function() {
    this.polygon.setMap(null);
  };
  
  this.clicked = function(event) {
    console.log("area " + area.name + " clicked.", event);
    if (area_control.editable) {
      if (shift_is_down && areas.active_area) {
        // shift is down, user wants to modify a area
        areas.active_area.addNewBorder(event);            
      }
      else {
        // shift is normally up
        if (!area.edit_mode) {
          area.activate();
        } else {
          area.showInfoWindow();
          //area.deactivate();
        }
      }
    }
    else if (poi_control.editable) {
      if (shift_is_down) {
        console.log("CREATE NEW POI");
	pois.create(event.latLng);
        //var poi = new Poi(pois.get_new_id(), '', event.latLng);
        //pois.add(poi);
        //poi.show();
      }
    }
  };

  this.activate = function() {
    console.log("area.activate");
    // deactivate the previous active
    areas.deactivate();
    area.edit_mode = true;
    areas.active_area = this;

    area.polygon.setOptions(activated_options);
    if (area_control.editable) {
      // show markers yo
      var path = area.polygon.getPath();
      for (var i = 0; i < path.length; i++) {
        var c = path.getAt(i);
        console.log(c.lat(), c.lng());
        showBorderMarker(c);
      }
    }
  };
  
  this.deactivate = function() {
    console.log("area.deactivate");
    area.edit_mode = false;
    areas.active_area = null;
    
    area.polygon.setOptions(deactivated_options);
    removeMarkers();
  };

  // when user clicks the map with shift key,
  // he adds a new boundary for this area
  this.addNewBorder = function(event) {
    console.log("add new border: ", area.name, event);
    var latLng = event.latLng;
    
    // edit polygon path
    // find the vertex
    var idx = getNearestVertex(area.polygon.getPath(), latLng)
    area.polygon.getPath().insertAt(idx, latLng);
    
    // see if this is already exists in boundaries array
    boundaries.add(event.latLng, area);
    showBorderMarker(event.latLng);
  };

  // remove this area and all belonging to it
  this.remove = function() {
    area.polygon.setMap(null);
    removeMarkers();
    var path = area.polygon.getPath();
    for (var i = 0; i < path.getLength(); i++) {
      var latLng = path.getAt(i);
      boundaries.remove(latLng, area);
    }
  };

  // shows a balloon of area info
  this.showInfoWindow = function() {
    var contentString = '<div class="infowindow"><form action="" method="post">' +
      '<input type="hidden" id="area_id" value="' + escape(area.id) + '" />' +
      '<table>' +
      '<tr><td>Number:</td><td><input type="text" id="area_number" value="' + area.number + '" class="field" /></td></tr>' +
      '<tr><td>Name:</td><td><input type="text" id="area_name" value="' + area.name + '" class="field" /></td></tr>' +
      '<tr><td></td><td><input type="submit" id="area_submit" value="Save" onclick="return areas.saveInfo(event)"/></td></tr>' +
      '</table></form></div>';
    var bounds = area.polygon.getBounds();
    info_window.setOptions({
      content: contentString,
      position: bounds.getCenter()
    });
    info_window.open(map);
  };

  // serialize this area to JSON, for posting to server
  this.toJSON = function() {
    var json = '{';
    json += '"id":"' + this.id + '",';
    json += '"number":"' + encodeJSON(this.number) + '",';
    json += '"name":"' + encodeJSON(this.name) + '",';
    json += '"path":[';
    var path = area.polygon.getPath();
    for (var i = 0; i < path.getLength(); i++) {
      if (i > 0) {
        json += ",";
      }
      json += path.getAt(i).toJSON();
    }
    json += ']';
    json += '}';
    return json;
  };

  // private functions
  var showBorderMarker = function(latLng) {
    console.log("showBorderMarker ", latLng, i);
    //var image = 'beachflag.png';
    var image = new google.maps.MarkerImage('images/red_dot.png',
      new google.maps.Size(14, 14), // icon size
      new google.maps.Point(0,0), // origin
      new google.maps.Point(7, 7)); // anchor
    var shape = {
      coord: [1, 1, 1, 14, 14, 14, 14 , 1],
      type: 'poly'
    };
    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      draggable: true,
      icon: image,
      shape: shape,
      //icon: 'http://google-maps-icons.googlecode.com/files/factory.png',
      title: 'Drag to edit, shift-click to remove'
    });
    // marker drag functionality
    var boundary = boundaries.find(latLng);
    if (!boundary) console.log("FATAL ERROR: no boundary found for this marker!");
    google.maps.event.addListener(marker, 'drag', function(event) {
      if (boundary) {
        if (shift_is_down) {
	  // if user is dragging marker with shift key down,
	  // move only marker belonging to this area
	  boundary.move(event.latLng, area);
	} else {
	  // normally drag marker for all areas linked here
          boundary.move(event.latLng);
	  // snap to another boundary within 5 px range
          var boundary_near = boundary.findNearBoundary(5);
          if (boundary_near) { 
	    boundary.move(boundary_near.latLng);
	    marker.setPosition(boundary_near.latLng);
	    //console.log("NEAR: ", boundary_near);
	  }
	}
      } 
    });
    google.maps.event.addListener(marker, 'dragend', function(event) {
      if (boundary) {
        // try to merge this boundary if it snapped with other boundary
        if (boundaries.mergeBoundary(boundary) === true) {
	  // dragging ended so that we merged it with another
	  // let's see if we have now two markers in the same place, if so, remove other
	  removeDuplicateMarkers();
	}
      }
    });
    
    // marker delete functionality
    google.maps.event.addListener(marker, 'click', function(event) {
      if (boundary && shift_is_down) {
        boundaries.remove(boundary.latLng, area);
	marker.setMap(null);
	//if (area.polygon.path.getLength == 0) {
	  //console.log("we should destroy the area now!");
	//}
	// normally shift + click on link opens a new window in firefox
	// we don't want that
	event.preventDefault(); 
      }
    });
    area.border_markers.push(marker);
    
    //google.maps.event.addDomListener(marker, 'click', function(event) { console.log("YAY", event); event.preventDefault(); });
  };

  // remove duplicate markers from this area
  var removeDuplicateMarkers = function() {
    for (var i = 0; i < area.border_markers.length; i++) {
      for (var j = i + 1; j < area.border_markers.length; j++) {
        var pos1 = area.border_markers[i].getPosition();
	var pos2 = area.border_markers[j].getPosition();
	if (pos1.equals(pos2)) {
	  console.log("removed duplicate marker");
	  area.border_markers[j].setMap(null);
	  area.border_markers.splice(j, 1);
	  return true; // duplicate removed
	}
      }
    }
    return false; // no dups
  };
  
  // remove markers
  var removeMarkers = function() {
    if (area.border_markers) {
      for (var i in area.border_markers) {
        area.border_markers[i].setMap(null);
      }
      // clear the array (and remove the markers from memory)
      area.border_markers.length = 0;
    }
  };

  // add click listener to polygon
  google.maps.event.addListener(this.polygon, 'click', this.clicked);
}

// -----------------------
// math functions

// returns index of vertex in path where c is nearest
function getNearestVertex(path, c) {
  var p1, p2;
  var smallestDistance;
  for (var i = 0; i < path.getLength(); i++) {
    p1 = path.getAt(i);
    if (i == 0) p2 = path.getAt(path.getLength() - 1);
    else p2 = path.getAt(i-1);
    
    var distance = distanceFromVertex(p1, p2, c);
    //console.log("distance: ", distance);
    if (!smallestDistance) smallestDistance = [ i, distance ];
    else if (distance < smallestDistance[1]) {
      smallestDistance = [ i, distance ];
    }
  }
  if (smallestDistance)
    return smallestDistance[0];  
  return 0;
}

function distanceFromVertex(p1, p2, c) {
  // calc distance by measuring travel: (p1 - c - p2) - (p1 - p2)
  var ab = latLngDistance(p1, p2);
  var distance = latLngDistance(p1, c) + latLngDistance(p2, c) - ab;
  return distance;
}

// count distance in coordinates a2 = b2 + c2
function latLngDistance(a, b) {
  var x = a.lng() - b.lng();
  var y = a.lat() - b.lat();
  var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
  return d;
}

function pointDistance(a, b) {
  var x = a.x - b.x;
  var y = a.y - b.y;
  var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
  return d;
}

// initialize the whole thing by calling initialize()
google.maps.event.addDomListener(window, 'load', initialize);

// extensions to Google Maps API v3
// --------------------------------

// latLng.toJSON()
// returns latLng as JSON array
if (!google.maps.LatLng.prototype.toJSON) {
  google.maps.LatLng.prototype.toJSON = function() {
    return "[" + this.lat() + "," + this.lng() + "]";
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

// Polygon containsLatLng - method to determine if a latLng is within a polygon
google.maps.Polygon.prototype.containsLatLng = function(latLng) {
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
