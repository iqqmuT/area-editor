<?php
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
 * Print page.
 */

include("lib/common.php");
include("lib/util.php");
include("lib/osm.php");
include("lib/osmarender.php");
include("lib/filecache.php");

$areas = json_decode($_POST['areas']); // area information is received as JSON
$pois = json_decode($_POST['pois']); // POI information is received as JSON
$format = $_POST['format'];

$map = null;
if (!strcmp($format, "dyn")) {
    $map = new DynMap($pois, $areas);
}
elseif (!strcmp($format, "svg_osmarender")) {
    $map = new SVGOsmarenderMap($pois, $areas);
}

/*
if (!strcmp($_POST['map-type'], 'OSM')) {
    $map = new OSMMap($pois, $areas);
}
else {
    $map = new GoogleMap($pois, $areas);
}*/
?>

<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/> 
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <link type="text/css" href="css/printable.css" rel="stylesheet" />
    <style type="text/css" media="print">
      @page land { size: landscape; }
    </style>
    <title><?php print_title(); ?></title>
  </head>
  <body>
    <?php print_header(); ?>
    <?php print $map->generate(); ?>
    <?php print $map->show_poi_details($pois); ?>
  </body>
</html>

<?php

// returns string of area info, if there is only one area
function get_area_info() {
    global $areas;
    if (count($areas) == 1) {
        $area = $areas[0];
	return $area->number . ":" . $area->name;
    }
    return false;
}

function print_title() {
    $title = "TOE - print";
    $area_info = get_area_info();
    if ($area_info) {
        $title .= "#" . htmlentities($area_info);
    }
    print $title;
}

function print_header() {
    $area_info = get_area_info();
    if ($area_info) {
        print "<h1>" . htmlentities($area_info) . "</h1>";
    }
}

class MapBase {
    public $pois, $areas, $width, $height, $output, $center, $zoom, $bounds;
    
    public function __construct($pois, $areas) {
        $this->pois = $pois;
	$this->areas = $areas;
	$this->width = 1400;
	$this->height = 830;
	$this->output = "";
        $this->center = $_POST['map-center'];
        $this->zoom = $_POST['map-zoom'];
	$this->bounds = parse_bounds($_POST['map-bounds']);
    }
    
    public function parseGoogleLatLng($str) {
        return "new google.maps.LatLng" . $str;
    }

    public function show_poi_details($pois) {
	$output = "";
	if (count($pois)) {
	    $i = 1;
	    $output .= '<ul class="poi-list">';
	    $area_info = get_area_info();
	    if ($area_info) {
	        $output .= '<b>' . htmlentities($area_info) . '</b>';
	    }
	    foreach ($pois as $poi) {
		$label = $i;
		$i = $i + 1;
		$li_class = ($i % 2 == 0) ? "odd" : "even";
	        $output .= '<li class="' . $li_class . '"><span class="label">';
	        $output .= $label . ":</span> ";
	        $output .= str_replace("\n", "<br/>", $poi->notes);
	        $output .= "</li>";
           }
	   $output .= '</ul>';
        }
        return $output;
    }
}

// dynmap uses google maps api to show draggable map
class DynMap extends MapBase {
    public function generate() {
	$this->output .= '<script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false"></script>';
	$this->output .= '<script type="text/javascript" src="js/print.js"></script>';
        $this->output .= '<div id="map_canvas" class="map"></div>';
        $this->output .= '<script type="text/javascript">' . 
	'var center = ' . $this->parseGoogleLatLng($this->center) . ';' .
        'var zoom = ' . $this->zoom . ';' . "\n" .
	'var map_type = "' . $_POST['map-type'] . '";' . "\n" .
	'var pois_data = ' . $_POST['pois'] . ';' . "\n" .
	'var areas_data = ' . $_POST['areas'] . ';' . "\n" .
	'google.maps.event.addDomListener(window, "load", function() { initialize(center, zoom, map_type); } );</script>';
	print $this->output;
    }
}

class OSMMap extends MapBase {
    public function generate() {
        return 'no osm map support';
    }
    public function show_poi_details($pois) {
	$output = "";
	if (count($pois)) {
	    $i = 1;
	    $output .= '<ul class="poi-list">';
	    foreach ($pois as $poi) {
                //$label = $this->labels[$i];
		$label = $i;
		$i = $i + 1;
	        //if ($i == count($this->labels)) { $i = 0; }
	        $output .= "<li><p>";
	        $output .= $label . ": ";
	        $output .= str_replace("\n", "<br/>", $poi->notes);
	        $output .= "</p></li>";
           }
	   $output .= '</ul>';
        }
        return $output;
    }
}

class GoogleMap extends MapBase {
    // http://code.google.com/intl/fi-FI/apis/maps/documentation/staticmaps/#Limits
    // Static Map URLs are restricted to 2048 characters in size.
    // static google map api support only single character label
    public $labels = array('1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','W','X','Y','Z');

    public function generate() {
	$this->output .= '<img class="map" src="http://maps.google.com/maps/api/staticmap?size=' . $this->width . 'x' . $this->height;
	$this->output .= '&center=' . $this->center;
	$this->output .= '&zoom=' . $this->zoom;
	$this->handlePOIs();
	$this->handleAreas();
        $this->output .= '&sensor=false">';
        return $this->output;
    }
    
    public function handlePOIs() {
        if (count($this->pois)) {
	    $i = 0;
	    foreach ($this->pois as $poi) {
	        $color = "red";
		$label = $this->labels[$i];
		$i = $i + 1;
		if ($i == count($this->labels)) { $i = 0; }
		// round the latlng to 6 decimals to save some chars
		// 6 decimals should be enough for everyone
		$position = $this->handleLatLng($poi->latLng);
		$this->output .= "&markers=label:$label|" . $position; 
	    }
	}
    }

    public function handleAreas() {
        if (count($this->areas)) {
	    foreach ($this->areas as $area) {
	        $color = "0xff0000a0";
		$weight = 5;
		//$fillcolor = "0x00000000";
		$this->output .= "&path=color:$color|weight:$weight";//|fillcolor:$fillcolor";
		if ($area->path && count($area->path)) {
		    foreach ($area->path as $latLng) {
		        //$position = $latLng[0] . "," . $latLng[1]; 
		        $position = $this->handleLatLng($latLng);
		        $this->output .= '|' . $position;
		    }
		    // we gotta do the last node still to close it
		    $latLng = $area->path[0];
		    $position = $this->handleLatLng($latLng);
		    $this->output .= '|' . $position;
		}
	    }
	}
    }

    public function show_poi_details($pois) {
	$output = "";
	if (count($pois)) {
	    $i = 0;
	    $output .= '<ul class="poi-list">';
	    foreach ($pois as $poi) {
                $label = $this->labels[$i];
		$i = $i + 1;
	        if ($i == count($this->labels)) { $i = 0; }
	        $output .= '<li><span class="label">';
		$output .= $label . ":</span> ";
	        $output .= str_replace("\n", "<br/>", $poi->notes);
	        $output .= "</li>";
           }
	   $output .= '</ul>';
        }
        return $output;
    }

    private function handleLatLng($latLng) {
        // round the latlng to 6 decimals to save some chars
	// 6 decimals should be enough for everyone
        $lat = round($latLng[0], 6);
	$lng = round($latLng[1], 6);
	return $lat . "," . $lng;
    }
}

class SVGOsmarenderMap extends MapBase {
    public function generate() {
	$cache = new FileCache();
        $svg = new OsmarenderSVG($this->pois, $this->areas, $this->bounds, $this->width, $this->height);
	$svg_file = $svg->write_file();
	$cache_name = basename($svg_file) . ".svg";
	$cache->add($svg_file, $cache_name);
        $svg_file = $cache->get($cache_name);
        $html = '<object data="' . $svg_file . '" type="image/svg+xml"> <param name="pluginurl" value="http://www.adobe.com/svg/viewer/install/" /></object>';
	print $html;
    }
}

?>
