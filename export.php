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
 * Exporting POI and area data.
 * Requires at least PHP 5.2.
 */

include("lib/util.php");
include("lib/osm.php");
include("lib/osmarender.php");

// data from browser should come already in UTF-8 encoding
$format = $_POST['format'];
$areas = json_decode($_POST['areas']); // area information is received as JSON
$pois = json_decode($_POST['pois']); // POI information is received as JSON
$bounds = parse_bounds($_POST['map-bounds']);
$width = 700;
$height = 700;

$export = null;
if (!strcmp($format, "osm")) {
    // export data in OSM format
    $export = new OSMExport($pois, $areas, $bounds, $width, $height);
}
elseif (!strcmp($format, "svg_osmarender")) {
    // export data in SVG format
    $export = new OsmarenderSVGExport($pois, $areas, $bounds, $width, $height);
}

/*
//echo "pois: " . $pois_json . "<br>";
echo "areas: " . $_POST['areas'];
echo "<br>";
$json = '{"a":1,"b":2,"c":3,"d":4,"e":"ä"}';
var_dump(json_decode($_POST['pois']));
echo count($pois);
echo count($areas);
die();*/

// download output as file
if ($export) {
    $export->asFile();
}
exit;

// EXPORT CLASSES
// --------------

class ExportBase {
    public $pois, $areas, $bounds, $width, $height, $filetype;
    
    public function __construct($pois, $areas, $bounds, $width, $height) {
        $this->pois = $pois;
	$this->areas = $areas;
	$this->bounds = $bounds;
	$this->width = $width;
	$this->height = $height;
    }

    function asFile() {
        $output = $this->output();
        $filename = $this->genFilename();
        header("Content-Type: " . $this->getFiletype());
        header("Content-Size: " . strlen($output));
        header("Content-Disposition: attachment; filename=\"".$filename."\"");
        header("Content-Length: " . strlen($output));
        header("Content-transfer-encoding: binary");
        echo $output;
    }
}

// OSM Exporter 
class OSMExport extends ExportBase {
    function getFiletype() {
        return "text/xml";
    }

    function output() {
        $osm = new OSMGenerator($this->pois, $this->areas);
	$dom = $osm->generateDOM();
	return $dom->saveXML();
    }

    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.osm");	// 'area_2010-10-28180603.osm'
    }
}

// SVG using Osmarender
class OsmarenderSVGExport extends ExportBase {
    function getFiletype() {
        return "text/xml";
    }

    function output() {
        $svg = new OsmarenderSVG($this->pois, $this->areas, $this->bounds, $this->width, $this->height);
	return $svg->output();
    }

    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.svg");	// 'area_2010-10-28180603.osm'
    }
}


?>
