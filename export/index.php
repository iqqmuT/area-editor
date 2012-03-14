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

/*include("lib/common.php");
include("lib/util.php");
include("lib/osm.php");
include("lib/mapnik.php");
*/

include("lib/common.php");

// data from browser should come already in UTF-8 encoding
$format = $_POST['format'];
$areas = array();
if (isset($_POST['areas']))
    $areas = json_decode($_POST['areas']); // area information is received as JSON
$pois = array();
if (isset($_POST['pois']))
    $pois = json_decode($_POST['pois']); // POI information is received as JSON
//$bounds = parse_bounds($_POST['map-bounds']);
$bounds = parse_bounds($_POST['bbox']);
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
elseif (!strcmp($format, "pdf")) {
    $export = new MapnikPDFExport($pois, $areas, $bounds, $width, $height);
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
    if ($export->export()) {
        // export succeed
        $export->asFile();
    } else {
        // export failed
        header('HTTP/1.0 500 Internal Server Error', true, 500);
        echo $export->getError();
    }
}
exit;

// EXPORT CLASSES
// --------------

class ExportBase {
    public $pois, $areas, $bounds, $width, $height, $filetype, $error;
    
    public function __construct($pois, $areas, $bounds, $width, $height) {
        $this->pois = $pois;
        $this->areas = $areas;
        $this->bounds = $bounds;
        $this->width = $width;
        $this->height = $height;
        $this->error = '';
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

    function getError() {
        return $this->error;
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
        return strftime("area_%Y-%m-%d_%H%M%S.svg"); // 'area_2010-10-28180603.osm'
    }
}

class MapnikExport extends ExportBase {
}

class MapnikPDFExport extends MapnikExport {
    private $mapnik, $output_file;

    function getFiletype() {
        return "application/pdf";
    }

    function export() {
        global $cfg;

        $style = 'default';
        if (isset($_POST['style']))
            $style = $_POST['style'];

        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
            1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
            2 => array("pipe", "w") // stderr is a file to write to
            //2 => array("file", "/tmp/error-output.txt", "a") // stderr is a file to write to
        );

        $cwd = $cfg['mapnik_home'];
        $cmd = $this->getCommand();
        $process = proc_open($cmd, $descriptorspec, $pipes, $cwd);

        $return_value = -1;
        if (is_resource($process)) {
            // $pipes now looks like this:
            // 0 => writeable handle connected to child stdin
            // 1 => readable handle connected to child stdout
            // Any error output will be appended to /tmp/error-output.txt

            $data = '{"areas":' . $_POST['areas'] . ',"pois":' . $_POST['pois'] . '}';
            fwrite($pipes[0], $data);
            fclose($pipes[0]);

            $output = stream_get_contents($pipes[1]);
            fclose($pipes[1]);

            $this->error = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            // It is important that you close any pipes before calling
            // proc_close in order to avoid a deadlock
            $return_value = proc_close($process);

            if ($return_value == 0 && file_exists($output)) {
                $this->output_file = $output;
                return true;
            }
            $this->error = "(" . $return_value . ") " . $this->error;
        }
        return false;
    }

    function getCommand() {
        global $cfg;
        $cmd = $cfg['mapnik_bin'];
        $cmd .= ' -b ' . $this->bounds . '';
        return $cmd;
    }

    function output() {
        return file_get_contents($this->output_file);
    }

    function genFilename() {
        return strftime("map_%Y-%m-%d_%H%M%S.pdf"); // 'area_2010-10-28180603.osm'
    }
}

?>
