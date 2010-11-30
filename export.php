<?php

/*
 * Exporting POI and area data.
 */

$VERSION = "0.1." . strftime("%Y%m%d", filemtime("export.php"));

// data from browser should come already in UTF-8 encoding
$format = $_POST['format'];
$pois = json_decode($_POST['pois']); // POI information is received as JSON
$areas = json_decode($_POST['areas']); // area information is received as JSON
$export = null;
if (!strcmp($format, "osm")) {
    // export data in OSM format
    $export = new OSMExport($pois, $areas);
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
$export->asFile();
exit;

// EXPORT CLASSES
// --------------

class ExportBase {
    public $pois, $areas;
    
    public function __construct($pois, $areas) {
        $this->pois = $pois;
	$this->areas = $areas;
    }
}

// OSM Exporter 
//
// Id's for nodes and ways will be re-generated
class OSMExport extends ExportBase {
    private $minLat, $minLng, $maxLat, $maxLng;
    private $dom, $parnode;
    private $id_counter;
    
    function output() {
        global $VERSION;
        $this->id_counter = 0;
        // Start XML file, create parent node
        $this->dom = new DOMDocument("1.0", "UTF-8");
	$this->dom->formatOutput = true;
        $node = $this->dom->createElement("osm");
	$node->setAttribute('version', '0.6');
	$node->setAttribute('generator', 'Online area editor ' . $VERSION);
        $this->parnode = $this->dom->appendChild($node);
    
        // TODO: how to get <bounds> (min & max from all coords)
        //$output = $pois[0]->address;
	$this->handlePois();
	$this->handleAreas();
        return $this->dom->saveXML();
    }
    
    function asFile() {
        $output = $this->output();
        $filename = $this->genFilename();
        header("Content-Type: text/xml");
        header("Content-Size: " . strlen($output));
        header("Content-Disposition: attachment; filename=\"".$filename."\"");
        header("Content-Length: " . strlen($output));
        header("Content-transfer-encoding: binary");
        echo $output;
    }
    
    // convert each POI object to XML
    function handlePois() {
        if (count($this->pois)) {
	    foreach ($this->pois as $poi) {
	        $node = $this->dom->createElement("node");
  	        $newnode = $this->parnode->appendChild($node);
	        //$newnode->setAttribute("id", $poi->id);
	        $newnode->setAttribute("id", $this->getNewNodeId());
	        $newnode->setAttribute("visible", "true");
	        $newnode->setAttribute("timestamp", $this->getTimestamp());
	        $newnode->setAttribute("lat", $poi->latLng[0]);
	        $newnode->setAttribute("lon", $poi->latLng[1]);
	  
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
	}
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
  	            $newnode = $this->parnode->appendChild($node);
	            $newnode->setAttribute("id", $way_node['id']);
	            $newnode->setAttribute("visible", "true");
	            $newnode->setAttribute("timestamp", $this->getTimestamp());
	            $newnode->setAttribute("lat", $way_node['lat']);
	            $newnode->setAttribute("lon", $way_node['lng']);
	        }
	        // create nodes for all ways
  	        foreach ($this->areas as $area) {
	            $node = $this->dom->createElement("way");
  	            $newnode = $this->parnode->appendChild($node);
		    $newnode->setAttribute("timestamp", $this->getTimestamp());
	            //$newnode->setAttribute("id", $area->id);
	            $newnode->setAttribute("id", $this->getNewNodeId());
	            $newnode->setAttribute("visible", "true");
	            $newnode->setAttribute("timestamp", $this->getTimestamp());
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
		    
	    }
	}
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
	//$seconds = strftime("%s");
	//$seconds = substr($seconds, strlen($seconds) - 8);
        //return "-" . $seconds . $this->id_counter;
    }
    
    function genFilename() {
        return strftime("area_%Y-%m-%d_%H%M%S.osm");	// 'area_2010-10-28180603.osm'
    }
}

?>
