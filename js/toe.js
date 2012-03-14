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
 * Main JavaScript file of TOE.
 * 
 * Requirements:
 *  - Google Maps JavaScript API v3
 *  - jQuery 1.4.x
 * 
 */

var toe = new function() {

  var map; // google map
  var overlay; // used for converting latlng -> point
  var info_window; // the info window

  // initialize
  this.init = function() {

    if (!window.console) console = {};
    console.log = console.log || function(){};
    console.warn = console.warn || function(){};
    console.error = console.error || function(){};
    console.info = console.info || function(){};

    var center = new google.maps.LatLng(61.483617, 21.7962775);
    var mapOptions = {
      zoom: 16,
      center: center,
      mapTypeId: 'OSM',
      mapTypeControlOptions: {
        mapTypeIds: ['OSM', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN ],
        style: google.maps.MapTypeControlStyle.DEFAULT
      },
      disableDefaultUI: false,
      scaleControl: true,
      disableDoubleClickZoom: true
    };
    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

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
    map.mapTypes.set('OSM', osm_map_type);
    map.setMapTypeId('OSM');

    var $mode_div = toe.control.Mode.create();
    map.controls[google.maps.ControlPosition.RIGHT].push($mode_div[0]);
    
    // create the div to hold our custom controls
    var $control_div = $("<div></div>");
    $control_div.css({ 'margin': '5px',
                       'border': '2px solid black' });
    $control_div.append(toe.control.Area.create());
    $control_div.append(toe.control.Poi.create());
    map.controls[google.maps.ControlPosition.RIGHT].push($control_div[0]);

    // our controls
    $menu_div = toe.control.Menu.create();
    map.controls[google.maps.ControlPosition.RIGHT].push($menu_div[0]);

    // add click listeners to the map
    google.maps.event.addListener(map, 'click', function(event) { toe.handler.mapClicked(event); });
    google.maps.event.addListener(map, 'dblclick', function(event) { toe.handler.mapDoubleClicked(event); });

    // dummy overlay, we will use this for converting 
    overlay = new google.maps.OverlayView();
    overlay.draw = function () {};
    overlay.setMap(map);

    // initialize info window, there is just one window here
    info_window = new google.maps.InfoWindow({});

    // initialize file dialog, and open the file-open dialog in initialize
    toe.dialog.init(true);

    // on window close, check if it's ok
    window.onbeforeunload = toe.destroy;
  };

  this.hasUnsavedChanges = function() {
    //return (pois.changed || areas.changed);
    return false;
  };

  this.destroy = function() {
    // show a confirmation dialog if user wants to leave the page without saving the changes
    if (toe.hasUnsavedChanges())
      return tr('unsaved_changes');
    else return null;
  };

  // gets bounds of all stuff we have on the map and zoom the map there
  this.zoom = function() {
    var bounds = new google.maps.LatLngBounds();
    if (areas.areas.length) {
      bounds.union(areas.getBounds());
    }
    console.log(bounds);
    if (pois.pois.length) {
      bounds.union(pois.getBounds());
    }
    console.log(bounds, pois.getBounds());
    if (!bounds.isEmpty()) {
      toe.map.fitBounds(bounds);
    }
  };

  // Controls
  // --------

  this.control = new function() {
    this.Mode = new function() {
      var self = this;
      this.NORMAL = 0;
      this.AREA = 1;

      this.selected = this.NORMAL;

      this.create = function() {
        var $main_div = $("<div />");

        var $normal_icon = $('<img src="http://maps.gstatic.com/mapfiles/drawing.png">');
        $normal_icon.css({
          'position': 'absolute',
          'left': '0px',
          'top': '-144px',
          'border': '0px none',
          'padding': '0px',
          'margin': '0px',
          'width': 'auto',
          'height': 'auto'
        });
        $normal = createMode($normal_icon);
        $normal.on('click', function() {
          self.change(self.NORMAL);
        });
        $main_div.append($normal);

        var $area_icon = $('<img src="http://maps.gstatic.com/mapfiles/drawing.png">');
        $area_icon.css({
          'position': 'absolute',
          'left': '0px',
          'top': '-64px',
          'border': '0px none',
          'padding': '0px',
          'margin': '0px',
          'width': 'auto',
          'height': 'auto'
        });
        $area = createMode($area_icon);
        $area.on('click', function() {
          self.change(self.AREA);
          toe.Areas.enable();
        });
        $main_div.append($area);


        return $main_div;
      };

      this.change = function(selection) {
        self.selected = selection;
      };

      var createMode = function(icon) {
        var $div = $("<div />");
        $div.css({
          'float': 'left',
          'line-height': '0'
        });
        var $innerdiv = $('<div><span style="display: inline-block;"><div style="width: 16px; height: 16px; overflow: hidden; position: relative"></div></span></div>');
        $innerdiv.css({
          'direction': 'ltr',
          'overflow': 'hidden',
          'text-align': 'left',
          'position': 'relative',
          'color': 'rgb(0,0,0)',
          'font-family': 'Arial,sans-serif',
          'font-size': '13px',
          'background': '-moz-linear-gradient(center top, rgb(255,255,255), rgb(230,230,230)) repeat scroll 0% 0% transparent',
          'padding': '4px',
          'border': '1px solid rgb(113, 123, 135)',
          'box-shadow': '0pt 2px 4px rgba(0, 0, 0, 0.4)',
          'font-weight': 'bold'
        });
        $div.append($innerdiv);
        $div.find('span').children('div').append(icon);
        return $div;
      };
        //direction: ltr; overflow: hidden; text-align: left; position: relative;
        // color: rgb(0, 0, 0); font-family: Arial,sans-serif; -moz-user-select: none;
        // font-size: 13px;
        // background: -moz-linear-gradient(center top , rgb(255, 255, 255), rgb(230, 230, 230)) repeat scroll 0% 0% transparent;
        // padding: 4px; border: 1px solid rgb(113, 123, 135);
        // box-shadow: 0pt 2px 4px rgba(0, 0, 0, 0.4); font-weight: bold;
    };
    
    this.Area = new function() {

      // area control
      this.visible = true;
      this.editable = true;
      var $ui;
      var $visible_ui;
      var self = this;

      var css_editable = {
        'background-color': 'rgb(240, 240, 240)',
        'font-weight': 'bold'
      };
      var css_readonly = {
        'background-color': 'white',
        'font-weight': 'normal'
      };
      var css_visible = { 'opacity': '1' };
      var css_invisible = { 'opacity': '0.1' };

      // creates control div
      this.create = function() {

        $ui = $('<div title="' + tr("Click to edit layer") + '">' + tr("Area") + '</div>');
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

        $visible_ui = $('<div title="' + tr("Click to toggle visibility") + '"><img src="images/stock-eye-20.png" alt="x" style="margin-top: 3px" /></div>');
        $visible_ui.css({
          'float': 'left',
          'padding-left': '4px',
          'padding-right': '4px'
        });

        $ui.append($visible_ui);

        $ui.click(function() {
          self.toggle_editable();
          poi_control.toggle_editable();
        });
        $visible_ui.click(function(event) {
          self.toggle_visible();
          event.stopPropagation();
        });

        return $ui;
      };
  
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
    };

    this.Poi = new function() {
      // POI control
      this.visible = true;
      this.editable = false;
      var self = this;
      var $ui;
      var $visible_ui;

      var css_editable = {
        'background-color': 'rgb(240, 240, 240)',
        'font-weight': 'bold' };
      var css_readonly = {
        'background-color': 'white',
        'font-weight': 'normal'
      };
      var css_visible = { 'opacity': '1' };
      var css_invisible = { 'opacity': '0.1' };

      this.create = function() {
        $ui = $('<div title="' + tr("Click to edit layer") + '">' + tr("POI") + '</div>');
        $ui.css({
          'cursor': 'pointer',
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

        $visible_ui = $('<div title="' + tr("Click to toggle visibility") + '"><img src="images/stock-eye-20.png" alt="x" style="margin-top: 3px" /></div>');
        $visible_ui.css({
          'float': 'left',
          'padding-left': '4px',
          'padding-right': '4px'
        });

        $ui.prepend($visible_ui);

        $ui.click(function() {
          self.toggle_editable();
          area_control.toggle_editable();
        });
        $visible_ui.click(function(event) {
          self.toggle_visible();
          event.stopPropagation();
        });
        return $ui;
      };
  
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
    };

    // control for importing / exporting files
    this.Menu = new function() {
      var self = this;

      this.create = function() {
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
        var $file_ui = $('<div id="file_button" style="padding-left: 30px" title="' +  tr("Click to open / close menu") + '"><span style="float:left">' + tr("Menu") + '</span><span id="file_button_icon" class="ui-icon ui-icon-triangle-1-s" style="float: left;"></span><div style="clear:both"></div></div>');
        $div.append($file_ui);
        $menu_div = $('<div id="file_menu"></div>');
        $menu_div.css({ 'display': 'none' });
        $div.append($menu_div);
        var $open_file_ui = $('<div id="open_file_button" class="file_menu_item" title="' + tr("Import data from file") + '">' + tr("Open file") + '...</div>');
        $menu_div.append($open_file_ui);
        var $save_file_ui = $('<div id="save_file_button" class="file_menu_item" title="' + tr("Export data into file") + '">' + tr("Save file")+ '...</div>');
        $menu_div.append($save_file_ui);
        var $print_ui = $('<div id="print_button" class="file_menu_item">' + tr("Print") + '</div>');
        $menu_div.append($print_ui);
        var $settings_ui = $('<div id="settings_button" class="file_menu_item" title="' + tr("Change settings") + '">' + tr("Settings") + '</div>');
        $menu_div.append($settings_ui);
        var $help_ui = $('<div id="help_button" class="file_menu_item">' + tr("Help") + '</div>');
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
        $settings_ui.click(function() {
          toe.dialog.Settings.open();
        });
        $open_file_ui.click(function() {
          toe.dialog.OpenFile.open();
        });
        $save_file_ui.click(function() {
          toe.dialog.SaveFile.open();
        });
        $print_ui.click(function() {
          toe.dialog.Print.open();
        });
        $help_ui.click(function() {
          toe.dialog.Help.open();
        });
        return $div;
      };
    };
  };


  // Dialogs
  // -------
  this.dialog = new function() {

    this.init = function(autoOpen) {  
      toe.dialog.OpenFile.init(autoOpen);
      toe.dialog.SaveFile.init();
      toe.dialog.Print.init();
      toe.dialog.Help.init();
      toe.dialog.Settings.init();
      $(".button").button();
    };

    this.Print = new function() {
      var $div;

      this.init = function() {
        $div = $('#print_dialog');
        $div.dialog({
          'title': '<span class="ui-icon ui-icon-print" style="float:left; margin-right: 5px;"></span>' + tr('Print'),
          'width': '300px',
          'autoOpen': false,
          'resizable': false
        });
      };

      this.open = function() {
        $div.dialog('open');
        return false;
      };

      this.close = function() {
        $div.dialog('close');
        return false;
      };
    };

    this.OpenFile = new function() {
      var $div;

      this.init = function(autoOpen) {
        $div = $('#file_open_dialog');
        $div.dialog({
          'title': '<span class="ui-icon ui-icon-folder-open" style="float:left; margin-right: 5px;"></span>' + tr('Open file'),
          'width': '300px',
          'autoOpen': autoOpen,
          'resizable': false
        });
      };
      this.open = function() { $div.dialog('open');  };
      this.close = function() { $div.dialog('close'); };
    };

    this.SaveFile = new function() {
      var $div;
      var self = this;

      this.init = function(autoOpen) {
        $div = $('#file_save_dialog');
        $div.dialog({
          'title': '<span class="ui-icon ui-icon-arrowthickstop-1-s" style="float:left; margin-right: 5px;"></span>' + tr('Save file'),
          'width': '300px',
          'autoOpen': false,
          'resizable': false,
          'close': function() {
            toe.helper.SelectionBox.hide();
          }
        });
        $('#export_form').submit(exportFile);
      };

      this.open = function() {
        $div.dialog('open');
        toe.helper.SelectionBox.show();
      };
      this.close = function() {
        $div.dialog('close');
      };

      // in export form submit, send values as JSON to server
      var exportFile = function() {
        console.log("exporting...");
        //$("#pois_json").val(pois.toJSON());
        $("#areas_json").val(toe.Areas.toJSON());
        $("#pois_json").val('[]');
        $("#export_map_bounds").val(map.getBounds().toString());
        self.close();
        // disable changed flags from areas and pois
        //areas.changed = false;
        //pois.changed = false;
        return true;
      };

    };

    this.Help = new function() {
      var $div;

      this.init = function(autoOpen) {
        $div = $('#help_dialog');
        $div.dialog({
          'title': '<span class="ui-icon ui-icon-help" style="float:left; margin-right: 5px;"></span>' + tr('Help'),
          'width': '500px',
          'autoOpen': false,
          'resizable': false
        });
      };
      this.open = function() {  $div.dialog('open');  };
      this.close = function() { $div.dialog('close'); };
    };

    this.Settings = new function() {
      var $div;
      var $self = this;

      this.init = function(autoOpen) {
        $div = $("#settings_dialog");
        $div.dialog({
          'title': '<span class="ui-icon ui-icon-wrench" style="float:left; margin-right: 5px;"></span>' + tr('Settings'),
          'width': '400px',
          'autoOpen': false,
          'resizable': false
        });
      };

      this.save = function() {
        // save settings from the dialog
        console.log("save settings");
        // save settings to cookie with ajax, get response as json
        var settings = $("#settings_form").serialize();
        $.get('settings.php?', settings, function(data) {
          console.log('response: ', data);
          if (data.changed) {
            if (data.redirect_url) {
              // setting changes require reload!
              window.location = data.redirect_url;
            }     
          }
          self.close();
        }, 'json');
        return false;
      };

      this.open = function() {  $div.dialog('open');  };
      this.close = function() { $div.dialog('close'); };
    };
  };

  this.file = new function() {
    this.importFile = function(data) {
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
    };
  };

  this.print = new function() {
    // opens a new window and submits needed data to new page
    this.openWindow = function() {

      var printable_page = window.open('about:blank', 'print_window', "status=1,toolbar=1,location=1,scrollbars=1,menubar=1,width=900,height=700");
  
      $("#print_map_type").val(map.getMapTypeId());
      $("#print_map_center").val(map.getCenter().toString());
      $("#print_map_zoom").val(map.getZoom());
      $("#print_map_bounds").val(map.getBounds().toString());
  
      // clear possible previous values
      $("#print_areas_json").val('[]');
      $("#print_pois_json").val('[]');
      if (areas.active_area) {
        // let's print only the active area and POIs inside it
        if (area_control.visible) {
          $("#print_areas_json").val(arrayToJSON([ areas.active_area ]));
        }
        if (poi_control.visible) {
          $("#print_pois_json").val(arrayToJSON(areas.active_area.getPOIs()));
        }
      } else {
        // let's print everything
        if (area_control.visible) {
          $("#print_areas_json").val(areas.toJSON());
        }
        if (poi_control.visible) {
          $("#print_pois_json").val(pois.toJSON());
        }
      }
      $("#print_dialog").dialog('close');
      return true;
    };
  };

  this.handler = new function() {
    this.mapClicked = function(event) {
      // this function will be overridden
      /*
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
    }*/
    };

    this.mapDoubleClicked = function(event) {
      // this function will be replaced
    };
  };

  // Areas
  // -----
  this.Areas = new function() {
    var self = this;
    this.changed = false;
    this.active_area;
    this.areas = [];
    this.new_id = 1;

    // areas mode activated
    this.enable = function(event) {
      // hijack event listeners here
      toe.handler.mapClicked = self.mapClicked;
      toe.handler.mapDoubleClicked = self.mapDoubleClicked;
    };

    // areas mode disabled
    this.disable = function() {
    };

    this.mapClicked = function(event) {
      console.log("AREAS:MAPCLICKED", event);
      //self.deactivate();
    };

    this.mapDoubleClicked = function(event) {
      console.log("AREAS:MAP DBL CLICKED", event);

      if (self.active_area) {
        console.log("ADD TO AREA ", self.active_area);
        self.active_area.addNewBorder(event);
      } else {
        // create a new area
        console.log("CREATE NEW AREA!");
        var area = new toe.Area(self.get_new_id(), '', '', [ event.latLng ]);
        self.add(area);
        area.show();
        area.activate();
      }

    };

    this.add = function(area) {
      if (this.find_by_id(area.id)) {
        console.log("id " + area.id + " is reserved, generating a new id for area");
        area.id = this.get_new_id();
      }
      this.areas.push(area);
      this.changed = true;
    };
  
    // remove given area
    this.remove = function(area) {
      for (var i = 0; i < this.areas.length; i++) {
        if (this.areas[i] == area) {
          if (confirm(tr('area_removal_confirm'))) {
            area.remove();
            this.areas.splice(i, 1);
            info_window.close(); // shut info window, because user might have used that to delete the area
            this.changed = true;
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
      var new_id = "" + time.getTime();
      return "-" + new_id.substring(new_id.length - 8);
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
      this.changed = true;
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
      var json = arrayToJSON(this.areas);
      console.log("export areas: ", json);
      return json;
    };

    // import areas from JSON data
    // returns integer of how many AREAs imported
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
        // XXX the area-missing-number&name bug is here
        this.add(new Area(area.id, area.number, area.name, path));
        c++;
      }
      if (area_control.visible) {
        this.show();
      }

      // XXX arnos hack
      console.log(dump(data));
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
      for (var i in this.areas) {
        this.areas[i].polygon.setOptions({ clickable: value });
      }
    };

    // Areas.BoundaryManager
    // ---------------------
    this.BoundaryManager = new function() {
      var self = this;
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
          boundary = new toe.Areas.Boundary(latLng);
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
    }; // BoundaryManager

    // Areas.Boundary
    // --------------
    this.Boundary = function(latLng) {
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
        } // for
        this.latLng = latLng; //  update our information at last
      };

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
      };

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
        } // for
        // replace areas, now given area should be missing
        // (or all areas)
        this.areas = new_areas;
      };
  
      // returns true if this boundary no longer is used
      this.empty = function() {
        return (this.areas.length == 0);
      };

      this.findNearBoundary = function(range) {
        var point = overlay.getProjection().fromLatLngToContainerPixel(this.latLng);
        for (var i = 0; i < toe.Areas.BoundaryManager.boundaries_arr.length; i++) {
          var boundary = toe.Areas.BoundaryManager.boundaries_arr[i];
          if (boundary == this) continue; // skip over this
          var boundary_point = overlay.getProjection().fromLatLngToContainerPixel(boundary.latLng);
          if (pointDistance(point, boundary_point) <= range) {
            return boundary;
          }
        }
        return null;
      };
    }; // Boundary
  }; // Areas

  // AREA
  // ----
  this.Area = function(id, number, name, path) {
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
      toe.Areas.BoundaryManager.add(latLng, area);
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
        }
      }
    };

    this.activate = function() {
      console.log("area.activate");
      // deactivate the previous active
      toe.Areas.deactivate();
      area.edit_mode = true;
      toe.Areas.active_area = this;

      area.polygon.setOptions(activated_options);
      //if (area_control.editable) {
      if (true) {
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
      toe.Areas.active_area = null;

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
      toe.Areas.BoundaryManager.add(event.latLng, area);
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
        '<tr><td></td><td>' +
        '<div class="area-functions">' +
        '<a href="#" onclick="return openPrintDialog();">' + tr("Print") + '</a> | <a href="#" onclick="return areas.remove(areas.active_area)">' + tr("Delete") + '</a>' +
        '</div>' +
        '</td></tr>' +
        '<tr><td>' + tr("Number") + ':</td><td><input type="text" id="area_number" value="' + area.number + '" class="field" /></td></tr>' +
        '<tr><td>' + tr("Name") + ':</td><td><input type="text" id="area_name" value="' + area.name + '" class="field" /></td></tr>' +
        '<tr><td></td><td><input type="submit" id="area_submit" value="' + tr("Save") + '" onclick="return areas.saveInfo(event)"/>' +
        '</td></tr>' +
        '</table></form></div>';
      var bounds = area.polygon.getBounds();
      info_window.setOptions({
        content: contentString,
        position: bounds.getCenter()
      });
      info_window.open(map);
      // move keyboard focus to the info window when it's ready
      google.maps.event.addListener(info_window, 'domready', function() {
        $("#area_number").focus();
      });
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

    // return array of POIs that are inside the area
    this.getPOIs = function() {
      var area_pois = [];
      for (var i in pois.pois) {
        var poi = pois.pois[i];
        if (this.polygon.containsLatLng(poi.getPosition())) {
          area_pois.push(poi);
        }
      }
      return area_pois;
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
        title: tr('Drag to edit, shift-click to remove'),
        raiseOnDrag: false
      });
      // marker drag functionality
      var boundary = toe.Areas.BoundaryManager.find(latLng);
      if (!boundary) console.log("FATAL ERROR: no boundary found for this marker!");
      google.maps.event.addListener(marker, 'drag', function(event) {
        if (boundary) {
          //if (shift_is_down) {
          if (false) {
            // if user is dragging marker with shift key down,
            // move only marker belonging to this area
            boundary.move(event.latLng, area);
          } else {
              /*
            // normally drag marker for all areas linked here
            boundary.move(event.latLng);
            // snap to another boundary within 5 px range
            var boundary_near = boundary.findNearBoundary(5);
            if (boundary_near) { 
              boundary.move(boundary_near.latLng);
              marker.setPosition(boundary_near.latLng);
              //console.log("NEAR: ", boundary_near);
            }*/
          }
        } 
      });
      google.maps.event.addListener(marker, 'dragend', function(event) {
        if (boundary) {

            boundary.move(event.latLng);
            // snap to another boundary within 5 px range
            var boundary_near = boundary.findNearBoundary(5);
            if (boundary_near) { 
              boundary.move(boundary_near.latLng);
              marker.setPosition(boundary_near.latLng);
              //console.log("NEAR: ", boundary_near);
            }




          // try to merge this boundary if it snapped with other boundary
          if (toe.Areas.BoundaryManager.mergeBoundary(boundary) === true) {
            // dragging ended so that we merged it with another
            // let's see if we have now two markers in the same place, if so, remove other
            removeDuplicateMarkers();
          }
         }
      });

      // marker delete functionality
      google.maps.event.addListener(marker, 'dblclick', function(event) {
        //if (boundary && shift_is_down) {
        if (boundary) {
          toe.Areas.BoundaryManager.remove(boundary.latLng, area);
          marker.setMap(null);
          //if (area.polygon.path.getLength == 0) {
          //console.log("we should destroy the area now!");
          //}
          // normally shift + click on link opens a new window in firefox
          // we don't want that
          //event.preventDefault(); 
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
  };

  this.helper = new function() {
    this.SelectionBox = new function() {

      var box = new google.maps.Rectangle({
        editable: true
      });

      this.show = function() {
        var bounds = map.getBounds();
        box.setMap(map);
        box.setBounds(bounds);
      };

      this.hide = function() {
        box.setMap(null);
      };

      this.getBounds = function() {
        box.getBounds();
      };
    };
  };


  // PRIVATE METHODS
  // ---------------
  var encodeJSON = function(str) {
    if (!str) return '';
    var encoded = str.replace(/\n/g, "\\n");
    encoded = encoded.replace(/\"/g, "\\\"");
    //encoded = encoded.replace(/\'/g, "\\\'");
    return encoded;
  };

  // very simple function to create JSON array
  // element of array must have method .toJSON()
  var arrayToJSON = function(arr) {
    var json = "[";
    for (var i in arr) {
      if (i > 0) {
        json += ",";
      }
      json += arr[i].toJSON();
    }
    json += "]";
    return json;
  };

  // -----------------------
  // math functions

  // returns index of vertex in path where c is nearest
  var getNearestVertex = function(path, c) {
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
  };

  var distanceFromVertex = function(p1, p2, c) {
    // calc distance by measuring travel: (p1 - c - p2) - (p1 - p2)
    var ab = latLngDistance(p1, p2);
    var distance = latLngDistance(p1, c) + latLngDistance(p2, c) - ab;
    return distance;
  };

  // count distance in coordinates a2 = b2 + c2
  var latLngDistance = function(a, b) {
    var x = a.lng() - b.lng();
    var y = a.lat() - b.lat();
    var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
    return d;
  };

  var pointDistance = function(a, b) {
    var x = a.x - b.x;
    var y = a.y - b.y;
    var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
    return d;
  };

};

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
