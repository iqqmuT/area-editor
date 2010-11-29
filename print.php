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
    <?php print $map->show_poi_details($pois); ?>
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


?>
