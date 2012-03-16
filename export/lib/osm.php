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
 */

// This will create a OSM DOM that can be used for OSM export
// Id's for nodes and ways will be re-generated
class OSMGenerator {
    protected $pois, $areas;
    protected $minLat, $minLng, $maxLat, $maxLng;
    protected $dom, $parnode;
    protected $id_counter;
    
    public function __construct($pois, $areas) {
        $this->pois = $pois;
	$this->areas = $areas;
        $this->id_counter = 0;
    }
    
    function getVersion() {
        return "0.1." . strftime("%Y%m%d", filemtime("lib/osm.php"));
    }
    
    function generateDOM() {
        // Start XML file, create parent node
        $this->dom = new DOMDocument("1.0", "UTF-8");
	$this->dom->formatOutput = true;
        $node = $this->dom->createElement("osm");
	$node->setAttribute('version', '0.6');
	$node->setAttribute('generator', 'Online area editor ' . $this->getVersion());
        $this->parnode = $this->dom->appendChild($node);
    
        // TODO: how to get <bounds> (min & max from all coords)
        //$output = $pois[0]->address;
	$this->handlePois();
	$this->handleAreas();
        return $this->dom;
    }

    // convert each POI object to XML
    function handlePois() {
        if (count($this->pois)) {
	    foreach ($this->pois as $poi) {
	        $node = $this->dom->createElement("node");
	        $this->createPoi($poi, $node);
	    }
	}
    }
    
    function createPoi($poi, $node) {
        $newnode = $this->parnode->appendChild($node);
	//$newnode->setAttribute("id", $poi->id);
	$newnode->setAttribute("id", $this->getNewNodeId());
	$newnode->setAttribute("visible", "true");
	$newnode->setAttribute("timestamp", $this->getTimestamp());
	$newnode->setAttribute("lat", $poi->latLng[0]);
	$newnode->setAttribute("lon", $poi->latLng[1]);
	$newnode->setAttribute("version", "1");
	  
	if (isset($poi->address) && strlen($poi->address) && strcmp($poi->address, 'undefined')) {
	    $this->addTag($newnode, "address", $poi->address);
	}
	if (isset($poi->name) && strlen($poi->name) && strcmp($poi->name, 'undefined')) {
	    $this->addTag($newnode, "name", $poi->name);
	}
	// we have to add visit tag or else we can't know this is POI
	$value = "";
	if (isset($poi->notes) && strlen($poi->notes) && strcmp($poi->notes, 'undefined')) {
	    $value = $poi->notes;
	    // get rid of newlines in tag, looks weird in JOSM
	    $value = str_replace("\n", " ", $value);
	}
        $this->addTag($newnode, "visit", $value);
    }
    
    // convert each Area object to XML
    function handleAreas() {
        if (count($this->areas)) {
	    // first create all the nodes from all area paths
	    $way_nodes = array();
            foreach ($this->areas as $area) {
	        if ($area->path && count($area->path)) {
		    foreach ($area->path as $latLng) {
		        $node = array();
			$node['id'] = $this->getNewNodeId();
			$node['lat'] = $latLng[0];
			$node['lng'] = $latLng[1];
			// node key is the latLng
		        $way_nodes[$this->latLngToString($latLng)] = $node;
		    }
		}
	    }
	    
	    if (count($way_nodes)) {
	        // create nodes for all nodes
	        foreach ($way_nodes as $latLng => $way_node) {
	            $node = $this->dom->createElement("node");
		    $this->createWayNode($way_node, $node);
	        }
	        // create nodes for all ways
  	        foreach ($this->areas as $area) {
	            $node = $this->dom->createElement("way");
		    $this->createWay($way_nodes, $area, $node);
		}
	    }
	}
    }
    
    function createWayNode($way_node, $node) {
        $newnode = $this->parnode->appendChild($node);
	$newnode->setAttribute("id", $way_node['id']);
	$newnode->setAttribute("visible", "true");
	$newnode->setAttribute("timestamp", $this->getTimestamp());
	$newnode->setAttribute("lat", $way_node['lat']);
	$newnode->setAttribute("lon", $way_node['lng']);
	$newnode->setAttribute("version", "1");
    }
    
    function createWay($way_nodes, $area, $node) {
        $newnode = $this->parnode->appendChild($node);
	$newnode->setAttribute("timestamp", $this->getTimestamp());
	//$newnode->setAttribute("id", $area->id);
	$newnode->setAttribute("id", $this->getNewNodeId());
	$newnode->setAttribute("visible", "true");
	$newnode->setAttribute("timestamp", $this->getTimestamp());
	$newnode->setAttribute("version", "1");
	if (isset($area->name) && strcmp($area->name, 'undefined')) {
	    $this->addTag($newnode, "name", $area->name);
	}
	if (isset($area->number) && strcmp($area->number, 'undefined')) {
	    $this->addTag($newnode, "number", $area->number);
	}
	if ($area->path && count($area->path)) {
	    foreach ($area->path as $latLng) {
	        $ref = $way_nodes[$this->latLngToString($latLng)]['id'];
	        $this->addWayNode($newnode, $ref);
	    }
	    // close the way by creating end node = start node
	    $ref = $way_nodes[$this->latLngToString($area->path[0])]['id'];
	    $this->addWayNode($newnode, $ref);
	}
	// add tag "area" = "yes" to tell this is an area
	$this->addTag($newnode, "area", "yes");
    }
    
    // appends a tag node to given parent node
    function addTag($parent_node, $key, $value) {
        $node = $this->dom->createElement("tag");
	$newnode = $parent_node->appendChild($node);
	$newnode->setAttribute("k", $key);
	$newnode->setAttribute("v", $value);
    }

    // appends a nd tag to given parent node
    function addWayNode($parent_node, $ref) {
        $node = $this->dom->createElement("nd");
	$newnode = $parent_node->appendChild($node);
	$newnode->setAttribute("ref", $ref);
    }
    
    function latLngToString($latLng) {
        return "" . $latLng[0] . "," . $latLng[1];
    }
    
    function getTimestamp() {
        return strftime("%Y-%m-%dT%H:%M:%SZ");	// '2010-10-28T18:06:03Z'
    }
    
    function getNewNodeId() {
        $this->id_counter = $this->id_counter + 1;
	return "-" . $this->id_counter;
    }
}

?>
