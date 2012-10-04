<?php
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
//$bounds = parse_bounds($_POST['bbox']);
$bounds = array();
$width = 700;
$height = 700;

$export = null;
if (!strcmp("osm", $format)) {
    // export data in OSM format
    $export = new OSMExport($pois, $areas, $bounds, $width, $height);
}
elseif (!strcmp("svg_osmarender", $format)) {
    // export data in SVG format
    $export = new OsmarenderSVGExport($pois, $areas, $bounds, $width, $height);
}
elseif (!strcmp("pdf", $format)) {
    $export = new MapnikPDFExport($pois, $areas, $bounds, $width, $height);
}
elseif (!strcmp("archive", $format)) {
    $export = new ArchiveExport($pois, $areas, $bounds, $width, $height);
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
        $export->printOutput();
    } else {
        // export failed
        $export->printError();
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

    function printOutput() {
        $output = $this->getContent();
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

    function printError() {
        header('HTTP/1.0 500 Internal Server Error', true, 500);
        echo str_replace("\n", "<br>", $this->getError());
    }
}

// OSM Exporter 
class OSMExport extends ExportBase {
    private $dom;

    function getFiletype() {
        return "text/xml";
    }

    function export() {
        $osm = new OSMGenerator($this->pois, $this->areas);
        $this->dom = $osm->generateDOM();
        return true;
    }

    function getContent() {
        return $this->dom->saveXML();
    }

    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.osm"); // 'area_2010-10-28180603.osm'
    }
}

// Archive Exporter
class ArchiveExport extends OSMExport {

    private $id;

    function export() {
        // do not save pois
        $osm = new OSMGenerator(array(), $this->areas);
        $this->dom = $osm->generateDOM();
        $data = $this->dom->saveXML();
        $archive = new Archive();
        $this->id = $archive->write($data);
        return true;
    }

    function printOutput() {
        echo $this->id;
    }
}

// SVG using Osmarender
class OsmarenderSVGExport extends ExportBase {
    function getFiletype() {
        return "text/xml";
    }

    function getContent() {
        $svg = new OsmarenderSVG($this->pois, $this->areas, $this->bounds, $this->width, $this->height);
        return $svg->output();
    }

    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.svg"); // 'area_2010-10-28180603.svg'
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

            if ($return_value == 0) {
                $output = trim($output);
                if (file_exists($output)) {
                  $this->output_file = $output;
                  return true;
                }
                $this->error .= " ERROR: file '" . $output . "' does not exist!";
            }
            $this->error = $output . "\n" . $this->error;
            $this->error = "(" . $return_value . ") " . $this->error;
            $this->error = $cmd . "\n" . $this->error;
        }
        return false;
    }

    function getCommand() {
        global $cfg;

        $cmd = $cfg['mapnik_bin'];
        $bounds = $_POST['bbox'];
        $cmd .= ' -b "' . $bounds . '"';

        if (isset($_POST['style']))
            $cmd .= ' -s ' . $_POST['style'];

        return $cmd;
    }

    function getContent() {
        return file_get_contents($this->output_file);
    }

    function genFilename() {
        return strftime("map_%Y-%m-%d_%H%M%S.pdf"); // 'area_2010-10-28180603.osm'
    }
}

?>
