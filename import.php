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
 * Importing POI and area data.
 */

$name = $_FILES['import_file']['name'];
$file = $_FILES['import_file']['tmp_name'];

// try to guess the format from the filename extension (ugly, urf!)
$extension = get_filename_extension($name);
$import = null;
if (!strcmp($extension, "osm")) {
    // OSM Import
    $import = new OSMImport($file);
}

$data = $import->parse();
$output = json_encode($data);

echo '<script type="text/javascript">';
echo 'var data = ' . $output . ';';
echo 'window.top.window.toe.importData(data);';
echo '</script>';

function get_filename_extension($filename) {
    $pos = strrpos($filename, ".");
    if ($pos === false) return $filename;
    return substr($filename, $pos + 1);
}

// IMPORT CLASSES
// --------------

class OSMImport {
    private $filename, $pois, $areas;
    private $minLat, $minLng, $maxLat, $maxLng;
    private $doc, $parnode;
    private $nodes, $ways;

    function __construct($filename) {
        $this->filename = $filename;
        $this->doc = new DOMDocument();
        $this->nodes = array();
    }

    function parse() {
        $this->doc->load($this->filename);
        $node = $this->doc->documentElement;
        if (strcmp($node->tagName, "osm")) {
            // ERROR: this is not OSM XML file, the root element should be <osm>!
            return 1;
        }
        $nb = $node->childNodes->length;
        for ($i = 0; $i < $nb; $i++) {
            $subnode = $node->childNodes->item($i);
            if (isset($subnode->tagName)) {
                if (!strcmp($subnode->tagName, "node")) {
                    $this->parseNode($subnode);
                } elseif (!strcmp($subnode->tagName, "way")) {
                    $this->parseWay($subnode);
                }
            }
        }

        // we have gone thru the tree and grabbed nodes and ways
        // that's actually everything we need now
        $pois = $this->createPois();
        $areas = $this->createAreas();

        $data = array();
        $data['areas'] = $areas;
        $data['pois'] = $pois;
        return $data;
    }

    function parseNode($node) {
        $id = $node->getAttribute("id");
        $lat = $node->getAttribute("lat");
        $lng = $node->getAttribute("lon");
        $this->nodes[$id] = array();
        $this->nodes[$id]["latLng"] = array(floatval($lat), floatval($lng));

        // let's see if this node has a subnode <tag>
        $nb = $node->childNodes->length;
        for ($i = 0; $i < $nb; $i++) {
            $subnode = $node->childNodes->item($i);
            if (isset($subnode->tagName) && !strcmp($subnode->tagName, "tag") && $subnode->hasAttribute("k") && $subnode->hasAttribute("v")) {
                // this has a subnode <tag>
                // save all tags to node's array
                $key = $subnode->getAttribute("k");
                $value = $subnode->getAttribute("v");
                $this->nodes[$id][$key] = $value;
            }
        }
    }

    function parseWay($node) {
        $id = $node->getAttribute("id");
        $this->ways[$id] = array();
        // way is array of node ids
        $path = array();

        // let's see if this node has a subnode <nd> or <tag>
        $nb = $node->childNodes->length;
        for ($i = 0; $i < $nb; $i++) {
            $subnode = $node->childNodes->item($i);
            if (isset($subnode->tagName) && !strcmp($subnode->tagName, "nd") && $subnode->hasAttribute("ref")) {
                // this has a subnode <nd>
                $ref = $subnode->getAttribute("ref");
                array_push($path, $ref);
            }
            if (isset($subnode->tagName) && !strcmp($subnode->tagName, "tag") && $subnode->hasAttribute("k") && $subnode->hasAttribute("v")) {
                // this has a subnode <tag>
                // save all tags to way's array
                $key = $subnode->getAttribute("k");
                $value = $subnode->getAttribute("v");
                $this->ways[$id][$key] = $value;
            }
        }
        if (count($path)) {
            // link the path to the way
            $this->ways[$id]['path'] = $path;
        }
    }

    function createPois() {
        $pois = array();
        foreach ($this->nodes as $id => $node) {
            if (isset($node['visit'])) {
                // because this node has a visit tag, this is a POI!
                $poi = array();
                $poi['id'] = $id;
                $poi['latLng'] = $node['latLng'];
                // look for tag with visit
                $poi['notes'] = $node['visit'];
                array_push($pois, $poi);
            }
        }
        return $pois;
    }

    function createAreas() {
        $areas = array();
        foreach ($this->ways as $id => $way) {
            // if path's first and last node ref is the same, this is an area!
            if (isset($way['path']) && count($way['path'])) {
                $path = $way['path'];
                $path_length = count($path);
                if ($path[0] == $path[$path_length - 1]) {
                    // this is an area, it has a closed way
                    $area = array();
                    $area['id'] = $id;
                    $area['path'] = array();
                    // we don't need the last coords, it should be the same as the first
                    for ($i = 0; $i < count($path) - 1; $i++) {
                        $nodeid = $path[$i];
                        if (isset($this->nodes[$nodeid])) {
                            $latLng = $this->nodes[$nodeid]['latLng'];
                            array_push($area['path'], array($latLng[0], $latLng[1]));
                        }
                    }
                    if (isset($way['name'])) {
                        $area['name'] = $way['name'];
                    }
                    if (isset($way['number'])) {
                        $area['number'] = $way['number'];
                    }
                    array_push($areas, $area);
                }
            }
        }
        return $areas;
    }
}
?>
