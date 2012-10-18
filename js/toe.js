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
 * Main JavaScript file of TOE.
 * 
 * Requirements:
 *  - jQuery >= 1.7.x
 * 
 */

var toe = {

  options: {
    single_click_timeout: 400, // timeout in ms
    snap_boundaries: 5,        // snap to other boundary within 5 px range
    cookie_name: 'toe',        // cookie name
    cookie_expire_days: 30,    // cookie expire in days
    archive: null,             // open archive in read only mode
    readonly: false
  },

  init: function(options) {
    if (!window.console) console = {};
    console.log = console.log || function(){};
    console.warn = console.warn || function(){};
    console.error = console.error || function(){};
    console.info = console.info || function(){};

    $.extend(this.options, options);

    // on window close, check if it's ok
    window.onbeforeunload = this.destroy;

    // initialize map
    this.map.init();

    // initialize file dialog, and open the file-open dialog in initialize
    this.dialog.init(false);

    if (options.archive)
      this._openArchive(options.archive);
  },

  hasUnsavedChanges: function() {
    //return (pois.changed || areas.changed);
    return false;
  },

  destroy: function() {
    toe._saveBounds();

    // show a confirmation dialog if user wants to leave the page without saving the changes
    if (toe.hasUnsavedChanges())
      return tr('unsaved_changes');
    else return null;
  },

  setReadonly: function(readonly) {
    this.options.readonly = readonly;
    if (this.options.readonly) {
      toe.control.Mode.element.hide();
      toe.control.Tools.element.hide();
    }
    else {
      toe.control.Mode.element.show();
      toe.control.Tools.element.show();
    }
  },

  // loads view from cookie
  _loadBounds: function() {
    if (document.cookie.length > 0) {
      var start = document.cookie.indexOf(this.options.cookie_name + '=');
      if (start != -1) {
        var end = document.cookie.indexOf(';', start);
        if (end != -1) {
          // found view from cookie
          var cookieTxt = document.cookie.substring(start, end);
          var bounds = toe.map.getLatLngBoundsByString(cookieTxt)
          return bounds;
        }
      }
    }
    return false;
  },

  // save current view to cookie
  _saveBounds: function() {
    var expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + this.options.cookie_expire_days);

    var cookieTxt = this.options.cookie_name + '=' + this.map.getBounds().toString();
    cookieTxt += ';expires=' + expireDate.toGMTString();
    //console.log("cookie:", cookieTxt);
    document.cookie = cookieTxt;
  },

  _openArchive: function(id) {
    console.log('open archive id', id);
    var self = this;
    $.getJSON('archive/', {
      id:     id
    }).success(function(data) {
      console.log('archive opened', data);
      toe.setReadonly(true);
      toe.importData({ areas: data });
    });
  }

  // gets bounds of all stuff we have on the map and zoom the map there
  /*
  zoom: function() {
    var bounds = new toe.map.LatLngBounds();
    if (areas.areas.length) {
      bounds.union(areas.getBounds());
    }
    console.log(bounds);
    if (pois.pois.length) {
      bounds.union(pois.getBounds());
    }
    console.log(bounds, pois.getBounds());
    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds);
    }
  }*/
};

toe.importData = function(data) {
  console.log("we are importing now!", data);
  var areas_imported = toe.AreaManager.importJSON(data.areas);
  //var pois_imported = toe.PoiManager.importJSON(data.pois);
  var pois_imported;
  console.log("areas imported: " + areas_imported);
  //console.log("POIs imported: " + pois_imported);
  if (pois_imported || areas_imported) {
    toe.dialog.OpenFile.close(); // we can close the dialog now
    toe.map.fitBounds();
  }
  else {
    // we imported nothing, invalid or empty data file
  }
};

// ------------------------------------------------------------
// Controls
// ------------------------------------------------------------
toe.control = {

  Mode: new function() {
    var self = this;
    this.NORMAL = 0;
    this.AREA = 1;

    this.selected = this.NORMAL;
    this.element = null;

    this.html = function() {
      var $main_div = $("<div />");
      $main_div.css({
        'margin': '5px',
        'index': '10px'
      });

      $normal = $('<div class="mode-div" id="mode_drag" title="' + tr("Stop drawing") + '"><div class="mode"><span style="display: inline-block;"><div class="mode-icon mode-drag selected"></div></span></div></div>');
      $normal.on('click', function() {
        self.selected = self.NORMAL;
        toe.AreaManager.disable();
        toe.map.changeDragMode();
        $('.mode-area').removeClass('selected');
        $('.mode-drag').addClass('selected');
      });
      $main_div.append($normal);

      $area = $('<div class="mode-div" id="mode_area" title="' + tr("Draw areas") + '"><div class="mode"><span style="display: inline-block;"><div class="mode-icon mode-area"></div></span></div></div>');
      $area.on('click', function() {
        self.selected = self.AREA;
        toe.AreaManager.enable();
        toe.map.changeAreaMode();
        $('.mode-drag').removeClass('selected');
        $('.mode-area').addClass('selected');
      });
      $main_div.append($area);

      this.element = $main_div;
      return this.element;
    };

    this.change = function(selection) {
      self.selected = selection;
    };

    var createMode = function(icon) {
      var $div = $('<div class="mode-div" />');
      var $innerdiv = $('<div class="mode"><span style="display: inline-block;"><div class="mode-icon mode-drag"></div></span></div>');
      $div.append($innerdiv);
      return $div;
    };
  },

  Tools: new function() {
    var self = this;
    this.NORMAL = 0;
    this.AREA = 1;

    this.selected = this.NORMAL;
    this.element = null;

    this.html = function() {
      var $main_div = $("<div />");

      var icon_css = {
        'position': 'absolute',
        'left': '0px',
        'top': '0px',
        'border': '0px none',
        'padding': '0px',
        'margin': '0px',
        'width': 'auto',
        'height': 'auto'
      };
      $open = createMode('<img src="images/tango/document-open.png" />', icon_css, tr("Open file"), function() {
        toe.dialog.OpenFile.open();
      });
      $main_div.append($open);
      $save = createMode('<img src="images/tango/document-save.png"/>', icon_css, tr("Save file"), function() {
        toe.dialog.SaveFile.open();
      });
      $main_div.append($save);

      $export = createMode('<img src="images/tango/document-print.png"/>', icon_css, tr("Print"), function() {
        toe.dialog.Print.open();
      });
      $main_div.append($export);

      $settings = createMode('<img src="images/tango/preferences-system.png"/>', icon_css, tr("Change settings"), function() {
        toe.dialog.Settings.open();
      });
      $main_div.append($settings);

      $clear = createMode('<img src="images/tango/edit-clear.png"/>', icon_css, tr("Clear drawings"), function() {
        toe.dialog.Settings.open();
      });
      $main_div.append($clear);

      $undo = createMode('<img src="images/tango/edit-undo.png"/>', icon_css, tr("Undo"), function() {
        toe.dialog.Settings.open();
      });
      $main_div.append($undo);

      $redo = createMode('<img src="images/tango/edit-redo.png"/>', icon_css, tr("Redo"), function() {
        toe.dialog.Settings.open();
      });
      $main_div.append($redo);

      $help = createMode('<img src="images/tango/help-browser.png"/>', icon_css, tr("Help"), function() {
        toe.dialog.Help.open();
      });
      $main_div.append($help);

      this.element = $main_div;
      return this.element;
    };

    this.change = function(selection) {
      self.selected = selection;
    };

    var createMode = function(icon, css, title, onClick) {
      var $div = $("<div />");
      $div.css({
        'line-height': '0',
        'margin-top': '5px',
        'margin-right': '5px'
      });
      var $innerdiv = $('<div title="' + title + '"><span style="display: inline-block;"><div style="width: 16px; height: 16px; overflow: hidden; position: relative"></div></span></div>');
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
        'font-weight': 'bold',
        'cursor': 'pointer'
      });
      $div.append($innerdiv);
      $icon_div = $(icon);
      $icon_div.css(css);
      $icon_div.on('click', onClick);
      $div.find('span').children('div').append($icon_div);
      return $div;
    };
  },
    
  Area: new function() {

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
    this.html = function() {

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
  },

  Poi: new function() {
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

    this.html = function() {
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
  },

  // control for importing / exporting files
  Menu: new function() {
    var self = this;

    this.html = function() {
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
  }
};


// ------------------------------------------------------------
// Dialog
// ------------------------------------------------------------
toe.dialog = {

  init: function(autoOpen) {  
    this.OpenFile.init(autoOpen);
    this.SaveFile.init();
    this.Print.init();
    this.Help.init();
    this.Settings.init();
    $(".button").button();
  },

  Print: new function() {
    var $div;
    var self = this;

    this.init = function() {
      $div = $('#print_dialog');
      $div.dialog({
        'title': '<span class="ui-icon ui-icon-print" style="float:left; margin-right: 5px;"></span>' + tr('Print'),
        'width': '300px',
        'autoOpen': false,
        'resizable': false,
        'close': function() {
          toe.helper.SelectionBox.hide();
        }
      });
      $('#print_form').on('submit', exportFile);
    };

    this.open = function() {
      $div.dialog('open');
      toe.helper.SelectionBox.show();
      return false;
    };

    this.close = function() {
      $div.dialog('close');
      return false;
    };

    // in export form submit, send values as JSON to server
    var exportFile = function(event, doSubmit) {
      // print only selected area or all if none selected
      if (doSubmit === true) {
        // archive ajax query succeed
        $("#print_areas_json").val(toe.AreaManager.toJSON(true));
        $("#print_pois_json").val('[]');
        $("#print_map_bounds").val(toe.helper.SelectionBox.toString());
        self.close();
        return true;
      }
      else {
        // archive first
        toe.AreaManager.archive().success(function(id) {
          $("#print_archive_id").val(id);
          var archive_url = document.URL.split('?')[0];
          archive_url += '?a=' + id;
          console.log('archive url:', archive_url);
          $("#print_archive_url").val(archive_url);
          $('#print_form').trigger('submit', true);
        });
        return false;
      }
    };
  },

  OpenFile: new function() {
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
  },

  SaveFile: new function() {
    var $div;
    var self = this;

    this.init = function(autoOpen) {
      $div = $('#file_save_dialog');
      $div.dialog({
        'title': '<span class="ui-icon ui-icon-arrowthickstop-1-s" style="float:left; margin-right: 5px;"></span>' + tr('Save file'),
        'width': '300px',
        'autoOpen': false,
        'resizable': false
      });
      $('#export_form').submit(exportFile);
    };

    this.open = function() {
      $div.dialog('open');
    };
    this.close = function() {
      $div.dialog('close');
    };

    // in export form submit, send values as JSON to server
    var exportFile = function() {
      console.log("exporting...");
      //$("#pois_json").val(pois.toJSON());
      $("#areas_json").val(toe.AreaManager.toJSON());
      $("#pois_json").val('[]');
      self.close();
      // disable changed flags from areas and pois
      toe.AreaManager.changed = false;
      //pois.changed = false;
      return true;
    };

  },

  Help: new function() {
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
  },

  Settings: new function() {
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
  }
};

// ------------------------------------------------------------
// Commands
// ------------------------------------------------------------
toe.command = {
  history: []
};

toe.command.execute = function(cmd) {
  toe.command.history.push(cmd);
};

toe.command.AddBorder = function() {
};

toe.command.AddBorder.prototype.undo = function() {
  console.log('undo');
};

toe.command.AddBorder.prototype.redo = function() {
  console.log('undo');
};

toe.command.AddBorder.prototype.execute = function() {
  console.log('exec');
};


// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------
toe.handler = {
  mapClicked: function(event) {
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
  },

  mapDoubleClicked: function(event) {
    // this function will be replaced
  }
};


// ------------------------------------------------------------
// AreaManager
// ------------------------------------------------------------
toe.AreaManager = new function() {
  var self = this;
  var click_timeout = null;
  
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
    if (this.active_area) {
      this.deactivate();
    }
    toe.handler.mapClicked = function() { };
    toe.handler.mapDoubleClicked = function() { };
  };

  this.mapClicked = function(event) {
    console.log("AREAS:MAPCLICKED", event);

    if (click_timeout) {
      clearTimeout(click_timeout);
    }
    click_timeout = setTimeout(function() {
      self.deactivate();
    }, toe.options.single_click_timeout);
  };

  this.mapDoubleClicked = function(event) {
    console.log("AREAS:MAP DBL CLICKED", event);
    clearTimeout(click_timeout);
    if (self.active_area) {
      console.log("ADD TO AREA ", self.active_area);
      self.active_area.addNewBorder(event);
    } else {
      // create a new area
      console.log("CREATE NEW AREA!", toe.map.getEventLatLng(event));
      var area = new toe.Area(self.get_new_id(), '', '', [ toe.map.getEventLatLng(event) ]);
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

  // removes all areas
  this.removeAll = function() {
    var tmp_areas = [];
    var i;
    for (i = 0; i < this.areas.length; i++) {
      tmp_areas.push(this.areas[i]);
    }
    for (i = 0; i < tmp_areas.length; i++) {
      this.remove(tmp_areas[i]);
    }
  };

  // remove given area
  this.remove = function(area) {
    for (var i = 0; i < this.areas.length; i++) {
      if (this.areas[i] == area) {
        area.remove();
        this.areas.splice(i, 1);
        this.changed = true;
        return true;
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
    var area = this.find_by_id(id);
    if (area) {
      var number = $("#area_number").val();
      var name = $("#area_name").val();
      area.number = number;
      area.name = name;
      area.changed = true;
      toe.map.infoWindow.hide();
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

  // serialize all areas or only selected area to JSON,
  // made for sending areas to server
  this.toJSON = function(onlySelectedArea) {
    var areas = this.areas;
    if (onlySelectedArea && toe.AreaManager.active_area) {
      areas = [ toe.AreaManager.active_area ];
    }
    var json = toe.util.arrayToJSON(areas);
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
          path.push(new toe.map.LatLng(lat, lng));
      }
      // XXX the area-missing-number&name bug is here
      this.add(new toe.Area(area.id, area.number, area.name, path));
      c++;
    }
    if (toe.control.Area.visible) {
      this.show();
    }

    return c;
  };

  // returns bounds of all areas
  this.getBounds = function() {
    var bounds = new toe.map.LatLngBounds();
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

  this.archive = function() {
    var jqxhr = $.post('archive/', {
      data: this.toJSON(true)
    });
    return jqxhr;
  };
};

// ------------------------------------------------------------
// BoundaryManager
// ------------------------------------------------------------
toe.BoundaryManager = new function() {
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
      boundary = new toe.Boundary(latLng);
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


// ------------------------------------------------------------
// Boundary
// ------------------------------------------------------------
toe.Boundary = function(latLng) {
  this.latLng = latLng;
  this.areas = []; // array of areas into which this belongs
}

// move boundary to given latLng
// if area is not given, move this boundary for all areas it
// is assigned to
toe.Boundary.prototype.move = function(latLng, area) {
  for (var i in this.areas) {
    if (!area || (area && this.areas[i] == area)) {
      if (this.areas[i].polygon.changePath(this.latLng, latLng)) {
        this.areas[i].changed = true;
      }
      /*
      var path = this.areas[i].polygon.getPath();
      for (var j = 0; j < path.getLength(); j++) {
        if (path.getAt(j).equals(this.latLng)) {
          path.setAt(j, latLng); // update polygon path
          this.areas[i].changed = true;
          break; // go to next area
        }
      }*/
    }
  } // for
  this.latLng = latLng; //  update our information at last
};

// add this boundary to a area
toe.Boundary.prototype.linkTo = function(area) {
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
toe.Boundary.prototype.unlink = function(area) {
  console.log("boundary.remove(", area, ")");
  var new_areas = [];
  for (var i in this.areas) {
    if (!area || (area && this.areas[i] == area)) {
      if (this.areas[i].polygon.removeFromPath(this.latLng)) {
        this.areas[i].changed = true;
      }
      /*
      var path = this.areas[i].polygon.getPath();
      for (var j = 0; j < path.getLength(); j++) {
        if (path.getAt(j).equals(this.latLng)) {
          path.removeAt(j); // update polygon path
          this.areas[i].changed = true;
          break; // go to next area
        }
      }*/
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
toe.Boundary.prototype.empty = function() {
  return (this.areas.length == 0);
};

toe.Boundary.prototype.findNearBoundary = function(range) {
  //var point = overlay.getProjection().fromLatLngToContainerPixel(this.latLng);
  console.log("find near", this.latLng);
  var point = this.latLng.toPoint();
  for (var i = 0; i < toe.BoundaryManager.boundaries_arr.length; i++) {
    var boundary = toe.BoundaryManager.boundaries_arr[i];
    if (boundary == this) continue; // skip over this
    //var boundary_point = overlay.getProjection().fromLatLngToContainerPixel(boundary.latLng);
    var boundary_point = boundary.latLng.toPoint();
    if (toe.util.pointDistance(point, boundary_point) <= range) {
      return boundary;
    }
  }
  return null;
};

// ------------------------------------------------------------
// Area
// ------------------------------------------------------------
toe.Area = function(id, number, name, path) {
  this.id = id;
  this.number = number;
  this.name = name;
  this.edit_mode = false;
  this.changed = false;
  this.border_markers = [];
  this.changed = false;
  this.click_timeout = null;

  var area = this;

  this.activated_options = {
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35
  };
  this.deactivated_options = {
    strokeColor: "#000000",
    strokeOpacity: 0.8,
    strokeWeight: 1,
    fillColor: "#000000",
    fillOpacity: 0.1
  };

  this.polygon = new toe.map.Polygon({
    paths: path,
    clicked: function(event) {
      area.clicked(event);
    },
    dblclicked: function(event) {
      area.doubleClicked(event);
    }
  });
  this.polygon.setColor(this.deactivated_options);

  // use boundaries array
  for (var i = 0; i < path.length; i++) {
    var latLng = path[i];
    toe.BoundaryManager.add(latLng, area);
  }
};

// method functions 
toe.Area.prototype.show = function() { this.polygon.show(); };
toe.Area.prototype.hide = function() { this.polygon.hide(); };

toe.Area.prototype.clicked = function(event) {
  console.log("area " + this.name + " clicked.", event);
  if (toe.control.Mode.selected == toe.control.Mode.AREA) {
    var self = this;
    this.click_timeout = setTimeout(function() {
      if (!self.edit_mode) {
        self.activate();
      } else {
        self.showInfoWindow();
      }
    }, toe.options.single_click_timeout);
  }
  else if (toe.control.Poi.editable) {
    if (shift_is_down) {
      console.log("CREATE NEW POI");
      pois.create(event.latLng);
    }
  }
};

toe.Area.prototype.doubleClicked = function(event) {
  console.log("area " + this.name + " clicked.", event);
  clearTimeout(this.click_timeout);
  if (toe.control.Mode.selected == toe.control.Mode.AREA) {
    if (toe.AreaManager.active_area) {
      toe.AreaManager.active_area.addNewBorder(event);
    }
  }
};

toe.Area.prototype.activate = function() {
  console.log("area.activate");
  // deactivate the previous active
  toe.AreaManager.deactivate();
  this.edit_mode = true;
  toe.AreaManager.active_area = this;

  this.polygon.setColor(this.activated_options);
  //if (area_control.editable) {
  if (true) {
    // show markers yo
    var path = this.polygon.getToePath();
    for (var i = 0; i < path.length; i++) {
      var c = path[i];
      console.log(c);
      this._showBorderMarker(c);
    }
  }
};

toe.Area.prototype.deactivate = function() {
  console.log("area.deactivate");
  this.edit_mode = false;
  toe.AreaManager.active_area = null;

  this.polygon.setColor(this.deactivated_options);
  this._removeMarkers();

  if (!this.isArea()) {
    // this area is incomplete, remove as unneeded
    toe.AreaManager.remove(this);
  }
};

// when user clicks the map with shift key,
// he adds a new boundary for this area
toe.Area.prototype.addNewBorder = function(event) {
  var latLng = toe.map.getEventLatLng(event);
  console.log("add new border: ", this.name, latLng);

  // edit polygon path
  // find the vertex
  var idx = toe.util.getNearestVertex(this.polygon.getToePath(), latLng)
  //this.polygon.getPath().insertAt(idx, latLng);
  this.polygon.addToPath(idx, latLng);

  // see if this is already exists in boundaries array
  toe.BoundaryManager.add(latLng, this);
  this._showBorderMarker(latLng);
};

// remove this area and all belonging to it
toe.Area.prototype.remove = function() {
  this.polygon.hide();
  this._removeMarkers();
  var path = this.polygon.getToePath();
  for (var i = 0; i < path.length; i++) {
    toe.BoundaryManager.remove(path[i], this);
  }
  toe.AreaManager.active_area = null;
};

// shows a balloon of area info
toe.Area.prototype.showInfoWindow = function() {
  var contentString = '<div class="infowindow" id="area_infowindow"><form action="" method="post" id="area_form">' +
    '<input type="hidden" id="area_id" value="' + escape(this.id) + '" />' +
    '<table>' +
    '<tr><td></td><td>' +
    '<div class="area-functions">' +
    //'<a href="javascript:" id="area_print">' + tr("Print") + '</a> | <a href="javascript:" id="area_delete">' + tr("Delete") + '</a>' +
    //'<a href="javascript:" id="area_delete">' + tr("Delete") + '</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td>' + tr("Number") + ':</td><td><input type="text" id="area_number" value="' + this.number + '" class="field first-focus" /></td></tr>' +
    '<tr><td>' + tr("Name") + ':</td><td><input type="text" id="area_name" value="' + this.name + '" class="field" /></td></tr>' +
    '<tr><td></td><td><input type="submit" id="area_submit" value="' + tr("Save") + '" onclick="return false;" />' +
    '<button id="area_delete">' + tr("Delete") + '</button>' +
    '</td></tr>' +
    '</table></form></div>';
    //'<script type="text/javascript">console.log("haha");; $(document).ready(function() { console.log("ready"); });</script>';
  var bounds = this.polygon.getBounds();

  var self = this;
  toe.map.infoWindow.show({
    content: contentString,
    position: bounds.getCenter(),
    ready: function() {
      $('.first-focus').focus();
      $('#area_submit').off('click').on('click', function(event) {
        toe.AreaManager.saveInfo(event);
        return false;
      });
      $('#area_print').off('click').on('click', function(event) {
        console.log("print this?");
      });
      $('#area_delete').off('click').on('click', function(event) {

        if (confirm(tr('area_removal_confirm'))) {
          if (toe.AreaManager.remove(self)) {
            toe.map.infoWindow.hide(); // shut info window
          }
        }
        return false;
      });
    }
  });
};

// serialize this area to JSON, for posting to server
toe.Area.prototype.toJSON = function() {
  var json = '{';
  json += '"id":"' + this.id + '",';
  json += '"number":"' + toe.util.encodeJSON(this.number) + '",';
  json += '"name":"' + toe.util.encodeJSON(this.name) + '",';
  json += '"path":[';
  var path = this.polygon.getToePath();
  for (var i = 0; i < path.length; i++) {
    if (i > 0) {
      json += ",";
    }
    json += path[i].toJSON();
  }
  json += ']';
  json += '}';
  return json;
};

// return array of POIs that are inside the area
toe.Area.prototype.getPOIs = function() {
  var area_pois = [];
  for (var i in pois.pois) {
    var poi = pois.pois[i];
    if (this.polygon.containsLatLng(poi.getPosition())) {
      area_pois.push(poi);
    }
  }
  return area_pois;
};

toe.Area.prototype._showBorderMarker = function(latLng) {
  console.log("_showBorderMarker ", latLng);

  var self = this;
  // marker drag functionality
  var boundary = toe.BoundaryManager.find(latLng);
  if (!boundary) console.log("FATAL ERROR: no boundary found for this marker!");

  var marker = new toe.map.AreaBorderMarker({
    position: latLng,
    title: tr('Drag to edit, dbl click to remove')
  });
  this.border_markers.push(marker);

  marker.setDrag(function(event) {
    if (boundary) {
      //if (shift_is_down) {
      if (false) {
        // if user is dragging marker with shift key down,
        // move only marker belonging to this area
        var latLng = toe.map.getEventLatLng(event);
        boundary.move(latLng, self);
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

  marker.setDragEnd(function(event) {
    if (boundary) {
      var latLng = this.getToeLatLng();
      boundary.move(latLng);

      if (toe.options.snap_boundaries > 0) {
        // snap to another boundary within 5 px range
        var boundary_near = boundary.findNearBoundary(toe.options.snap_boundaries);
        if (boundary_near) { 
          boundary.move(boundary_near.latLng);
          marker.setToeLatLng(boundary_near.latLng);
          //console.log("NEAR: ", boundary_near);
        }
      }

      // try to merge this boundary if it snapped with other boundary
      if (toe.BoundaryManager.mergeBoundary(boundary) === true) {
        // dragging ended so that we merged it with another
        // let's see if we have now two markers in the same place, if so, remove other
        self.removeDuplicateMarkers();
      }
    }
  });

  // marker delete functionality
  marker.setDoubleClick(function(event) {
    //if (boundary && shift_is_down) {
    if (boundary) {
      toe.BoundaryManager.remove(boundary.latLng, self);
      marker.remove();
      //if (area.polygon.path.getLength == 0) {
      //console.log("we should destroy the area now!");
      //}
      // normally shift + click on link opens a new window in firefox
      // we don't want that
      //event.preventDefault(); 
    }
  });

};

// remove duplicate markers from this area
toe.Area.prototype.removeDuplicateMarkers = function() {
  for (var i = 0; i < this.border_markers.length; i++) {
    for (var j = i + 1; j < this.border_markers.length; j++) {
      var pos1 = this.border_markers[i].getToeLatLng();
      var pos2 = this.border_markers[j].getToeLatLng();
      if (pos1.equals(pos2)) {
        console.log("removed duplicate marker");
        this.border_markers[j].remove();
        this.border_markers.splice(j, 1);
        return true; // duplicate removed
      }
    }
  }
  return false; // no dups
};

/**
 * Returns true if area has at least 3 points.
 */
toe.Area.prototype.isArea = function() {
  return (this.polygon.getToePath().length > 2);
};

// remove markers
toe.Area.prototype._removeMarkers = function() {
  if (this.border_markers) {
    for (var i in this.border_markers) {
      this.border_markers[i].remove();
    }
    // clear the array (and remove the markers from memory)
    this.border_markers.length = 0;
  }
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

toe.helper = {
  SelectionBox: new function() {

    var box = null;
    this.show = function() {
      if (!box) {
        box = new toe.map.Rectangle({
          editable: true
        });
      }
      var bounds = toe.map.getBounds();
      box.show(bounds.resize(0.85));
    };

    this.hide = function() {
      box.hide();
    };

    this.getBounds = function() {
      return box.getBounds();
    };

    this.toString = function() {
      return box.toString();
    };
  }
};



  // PRIVATE METHODS
  // ---------------
toe.util = {
  encodeJSON: function(str) {
    if (!str) return '';
    var encoded = str.replace(/\n/g, "\\n");
    encoded = encoded.replace(/\"/g, "\\\"");
    //encoded = encoded.replace(/\'/g, "\\\'");
    return encoded;
  },

  // very simple function to create JSON array
  // element of array must have method .toJSON()
  arrayToJSON: function(arr) {
    var json = "[";
    for (var i in arr) {
      if (i > 0) {
        json += ",";
      }
      json += arr[i].toJSON();
    }
    json += "]";
    return json;
  },

  // -----------------------
  // math functions

  // returns index of vertex in path where c is nearest
  getNearestVertex: function(path, c) {
    var p1, p2;
    var smallestDistance;
    for (var i = 0; i < path.length; i++) {
      p1 = path[i];
      if (i == 0) p2 = path[path.length - 1];
      else p2 = path[i-1];

      var distance = this.distanceFromVertex(p1, p2, c);
      //console.log("distance: ", distance);
      if (!smallestDistance) smallestDistance = [ i, distance ];
      else if (distance < smallestDistance[1]) {
        smallestDistance = [ i, distance ];
      }
    }
    if (smallestDistance)
      return smallestDistance[0];  
    return 0;
  },

  distanceFromVertex: function(p1, p2, c) {
    // calc distance by measuring travel: (p1 - c - p2) - (p1 - p2)
    var ab = this.latLngDistance(p1, p2);
    var distance = this.latLngDistance(p1, c) + this.latLngDistance(p2, c) - ab;
    return distance;
  },

  // count distance in coordinates a2 = b2 + c2
  latLngDistance: function(a, b) {
    var x = a.getLng() - b.getLng();
    var y = a.getLat() - b.getLat();
    var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
    return d;
  },

  pointDistance: function(a, b) {
    // pythagorean theorem
    var x = a.x - b.x;
    var y = a.y - b.y;
    var d = Math.sqrt(Math.pow(x,2) + Math.pow(y,2));
    return d;
  },

};
