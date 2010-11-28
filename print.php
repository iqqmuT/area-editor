<?php
/* 
 * Prints static printable map
 */

$areas = json_decode($_POST['areas']); // area information is received as JSON
$pois = json_decode($_POST['pois']); // POI information is received as JSON
if (!strcmp($_POST['map-type'], 'OSM')) {
    $map = new OSMMap($pois, $areas);
}
else {
    $map = new GoogleMap($pois, $areas);
}
?>

<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/> 
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <!--<link type="text/css" href="css/ui-darkness/jquery-ui-1.8.6.custom.css" rel="stylesheet" />-->
    <link type="text/css" href="css/printable.css" rel="stylesheet" />
    <!--<script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false"></script>-->
    <!--<script type="text/javascript" src="http://code.jquery.com/jquery-1.4.4.min.js"></script>
    <script type="text/javascript" src="js/jquery-ui-1.8.6.custom.min.js"></script>-->
    <!-- <script type="text/javascript" src="js/printable_area.js"></script>-->
    <title>Online area editor - print page</title>
  </head>
  <body>
    <?php print $map->generate(); ?>
    <?php print show_poi_details($pois); ?>
  </body>
</html>

<?php

class MapBase {
    public $pois, $areas, $width, $height, $output, $center, $zoom;
    
    public function __construct($pois, $areas) {
        $this->pois = $pois;
	$this->areas = $areas;
	$this->width = 700;
	$this->height = 700;
	$this->output = "";
        $this->center = $_POST['map-center'];
        $this->zoom = $_POST['map-zoom'];
    }
}

class OSMMap extends MapBase {
    public function generate() {
        return 'no osm map support';
    }
}

class GoogleMap extends MapBase {
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
	    $label = 0;
	    foreach ($this->pois as $poi) {
	        $color = "red";
		$label = $label + 1;
		$position = $poi->latLng[0] . "," . $poi->latLng[1];
		$this->output .= "&markers=color:$color|label:$label|" . $position; 
	    }
	}
    }

    public function handleAreas() {
        if (count($this->areas)) {
	    foreach ($this->areas as $area) {
	        $color = "0xff0000a0";
		$weight = 5;
		$this->output .= "&path=color:$color|weight:$weight";
		if ($area->path && count($area->path)) {
		    foreach ($area->path as $latLng) {
		        $position = $latLng[0] . "," . $latLng[1]; 
		        $this->output .= '|' . $position;
		    }
		    // we gotta do the last node still to close it
		    $latLng = $area->path[0];
		    $position = $latLng[0] . "," . $latLng[1]; 
		    $this->output .= '|' . $position;
		}
	    }
	}
    }
}

function show_poi_details($pois) {
    $output = "";
    if (count($pois)) {
        $i = 0;
        $output .= '<ol class="poi-list">';
	foreach ($pois as $poi) {
	     $i++;
	     $output .= "<li><p>";
	     //$output .= $i . ": ";
	     $output .= str_replace("\n", "<br/>", $poi->notes);
	     $output .= "</p></li>";
        }
	$output .= '</ol>';
    }
    return $output;
}

?>