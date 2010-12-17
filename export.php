<?php

/*
 * Exporting POI and area data.
 * Requires at least PHP 5.2.
 */

include("lib/osm.php");
include("lib/osmarender.php");

// data from browser should come already in UTF-8 encoding
$format = $_POST['format'];
$areas = json_decode($_POST['areas']); // area information is received as JSON
$pois = json_decode($_POST['pois']); // POI information is received as JSON
$bounds = parse_bounds($_POST['map-bounds']);

$export = null;
if (!strcmp($format, "osm")) {
    // export data in OSM format
    $export = new OSMExport($pois, $areas, $bounds);
}
elseif (!strcmp($format, "svg_osmarender")) {
    // export data in SVG format
    $export = new OsmarenderSVGExport($pois, $areas, $bounds);
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
    public $pois, $areas, $bounds, $filetype;
    
    public function __construct($pois, $areas, $bounds) {
        $this->pois = $pois;
	$this->areas = $areas;
	$this->bounds = $bounds;
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
        $svg = new OsmarenderSVG($this->pois, $this->areas, $this->bounds);
	return $svg->output();
	//$dom = $svg->generateDOM();
	//return $svg->saveXML();
    }

    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.svg");	// 'area_2010-10-28180603.osm'
    }
}

// util functions
// parses string "((-37.43997405227057, -126.5625), (37.43997405227057, 126.5625))"
function parse_bounds($bounds) {
    $parts = explode(',', $bounds);
    for ($i = 0; $i < count($parts); $i++) {
        $parts[$i] = trim($parts[$i], " ()");
    }
    $bounds_arr = array(array($parts[0], $parts[1]),
                        array($parts[2], $parts[3]));
    return $bounds_arr;
}

?>
