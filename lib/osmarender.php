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
 * Classes for using Osmarender.
 */

class OsmarenderSVG {
    public $pois, $areas, $bounds;
    public $dir = "osm-to-png";
    public $osmosis;
    
    public function __construct($pois, $areas, $bounds, $width, $height) {
        $this->pois = $pois;
	$this->areas = $areas;
	$this->bounds = $bounds;
	$this->width = $width;
	$this->height = $height;
	$this->osmosis = $this->dir . "/osmosis-0.35/bin/osmosis";
    } 
    
    public function write_file() {
        // create a merged file, that has our data and osm data combined
	$osm_file = $this->writeOSM();
        $merged_file = $this->mergeWithMap($osm_file);
	//$chopped_file = $this->cropMap($merged_file);
	$svg_file = $this->convertToSVG($merged_file);
	$data = file_get_contents($svg_file);
	return $svg_file;
	unlink($svg_file);
	return $data;
    }
    
    public function output() {
	$svg_file = $this->write_file();
	// this might be a bad idea if svg file is huge
	$data = file_get_contents($svg_file);
	unlink($svg_file);
	return $data;
    }
    
    private function writeOSM() {
	$osm = new OSMOsmosis($this->pois, $this->areas);
	$dom = $osm->generateDOM();
	$xml = $dom->saveXML();
	// write our osm data to tmp file
	$file_out = $this->writeTempFile($xml);
	return $file_out;
    }
    
    private function mergeWithMap($file_in) {
	// merge our osm data and osm map data
	$this->downloadMap();
	$file_out = $this->tempnam();
	$map_file = $this->dir . "/map.osm";
	$cmd = $this->osmosis . " --read-xml file=$file_in --sort-0.6 --read-xml file=$map_file --sort-0.6 --merge --write-xml file=$file_out";
	// force to redirect stderr to stdout (guess this wont work in windows)
	$cmd .= " 2>&1";
	$output = shell_exec($cmd);
	unlink($file_in); // get rid of file_in
	if (!filesize($file_out)) {
	    // error occurred!
	    unlink($file_out);
	    die('Export error when merging the map:<br>' . $cmd . '<pre>' . $output  . '</pre>');
	}
	// add <bounds> tag, osmarender will use it
	// TODO: is there any other way to add <bounds> tag, perhaps using osmosis?
	$this->addBoundsTag($file_out);	
		
	// return generated file
	return $file_out;
    }
    
    // downloads map from osm server
    private function downloadMap() {
        $target = $this->dir . "/map.osm";
	$map_file = fopen($target, "w");
	$top = $this->bounds[1][0];
	$left = $this->bounds[0][1];
	$bottom = $this->bounds[0][0];
	$right = $this->bounds[1][1];
	$url = "http://www.openstreetmap.org/api/0.6/map?bbox=$left,$bottom,$right,$top";
	$handle = fopen($url, "r");
	$contents = "";
	while (!feof($handle)) {
	    $contents = fread($handle, 8192);
	    fwrite($map_file, $contents);
	}
	fclose($handle);
	fclose($map_file);
    }
    
    // adds <bounds> tag to OSM, used for osmarender
    private function addBoundsTag($file_in) {
        $fh_in = fopen($file_in, "r");
	$tmpfile = $this->tempnam();
	$fh_out = fopen($tmpfile, "w");
	$contents = "";
	$added = false;
	while (!feof($fh_in)) {
	    $contents = fread($fh_in, 8192);
	    if (!$added) {
	        $pos = strpos($contents, '<osm version="0.');
		if ($pos) {
		  $pos = strpos($contents, '>', $pos);
		}
		if ($pos) {
		    $pos++;
	            $top = $this->bounds[1][0];
	            $left = $this->bounds[0][1];
	            $bottom = $this->bounds[0][0];
	            $right = $this->bounds[1][1];
		    $new_contents = substr($contents, 0, $pos);
		    $new_contents .= " <bounds minlat=\"$bottom\" minlon=\"$left\" maxlat=\"$top\" maxlon=\"$right\"/>\n";
		    $new_contents .= substr($contents, $pos);
		    $contents = $new_contents;
  	            $added = true;
		}
	    }
	    fwrite($fh_out, $contents);
	}
	fclose($fh_in);
	fclose($fh_out);
	rename($tmpfile, $file_in);
    }

    // modify width and height attribute of svg tag (stupidish way)
    private function resize($file_in, $width, $height) {
        $fh_in = fopen($file_in, "r");
	$tmpfile = $this->tempnam();
	$fh_out = fopen($tmpfile, "w");
	$contents = "";
	$changed = false;
	while (!feof($fh_in)) {
	    $contents = fread($fh_in, 8192);
	    if (!$changed) {
	        // modify width and height attributes with regexp
		// first, get current aspect ratio
                preg_match("/ width=\"([\d.]+)px\"/", $contents, $match);
                $current_width = floatval($match[1]);
                preg_match("/ height=\"([\d.]+)px\"/", $contents, $match);
                $current_height = floatval($match[1]);
		$aspect_ratio = $current_width / $current_height;

                // preserve aspect ratio		
		if ($aspect_ratio > 1) {
		    $height = $width / $aspect_ratio;
		}
		else {
		    $width = $height * $aspect_ratio;
		}
		
		$pattern = "/ width=\"([\d.]+)px\"/";
                $replacement = ' width="' . $width . 'px"';
                $new_contents = preg_replace($pattern, $replacement, $contents);
		$contents = $new_contents;

		$pattern = "/ height=\"([\d.]+)px\"/";
                $replacement = ' height="' . $height . 'px"';
                $new_contents = preg_replace($pattern, $replacement, $contents);
		$contents = $new_contents;
		
		$changed = true;
	    }
	    fwrite($fh_out, $contents);
	}
	fclose($fh_in);
	fclose($fh_out);
	rename($tmpfile, $file_in);
    }
    
    private function cropMap($file_in) {
	// crop the map with given bounds
	$file_out = $this->tempnam();
	$top = $this->bounds[1][0];
	$left = $this->bounds[0][1];
	$bottom = $this->bounds[0][0];
	$right = $this->bounds[1][1];
	$cmd = $this->osmosis . " --read-xml file=$file_in --bounding-box top=$top left=$left bottom=$bottom right=$right completeWays=\"yes\" --write-xml file=$file_out";
	// force to redirect stderr to stdout in case we want to debug
	// (guess this wont work in windows)
	$cmd .= " 2>&1";
	$output = shell_exec($cmd);
	unlink($file_in); // get rid of file_in
	if (!filesize($file_out)) {
	    // error occurred!
	    unlink($file_out);
	    die('Export error when cropping the map:<br>' . $cmd . '<br>' . $output);
	}
	// return generated file
	return $file_out;
    }
    
    private function convertToSVG($file_in) {
	$file_out = $this->tempnam();
	// our osm file needs to be in osmarender/xslt/data.osm
	// TODO: we need a sync lock here! flock?
	$target = $this->dir . "/osmarender/xslt/data.osm";
	copy($file_in, $target);
	$pwd = getcwd();
	chdir($this->dir . "/osmarender/xslt");
	$cmd = "xsltproc osmarender.xsl terriz17.xml > $file_out";
	$output = shell_exec($cmd);
	chdir($pwd);
	unlink($file_in); // get rid of file_in
	if (!filesize($file_out)) {
	    // error occurred!
	    unlink($file_out);
	    die('Export error when converting osm to svg:<br>' . $cmd . '<br>' . $output);
	}
	$this->resize($file_out, $this->width, $this->height);
	return $file_out;
    }
    
    public function tempnam() {
        // we are a bit linux specific
        return tempnam('/tmp', 'osmarender');
    }
    
    // writes given data to tmp file and returns filename
    // remember to unlink it
    public function writeTempFile($data) {
        $filename = $this->tempnam();
	file_put_contents($filename, $data);
	return $filename;
    }
}

// Extend OSMGenerator class for our own purpose
// Based on convert-NUMBER-osm-and-terr-to-png.sh
class OSMOsmosis extends OSMGenerator {
    public $visit_num = 1;
    
    function createPoi($poi, $node) {
        $newnode = $this->parnode->appendChild($node);
	//$newnode->setAttribute("id", $poi->id);
	$newnode->setAttribute("id", $this->getNewNodeId());
	$newnode->setAttribute("visible", "true");
	$newnode->setAttribute("timestamp", $this->getTimestamp());
	$newnode->setAttribute("lat", $poi->latLng[0]);
	$newnode->setAttribute("lon", $poi->latLng[1]);
	$newnode->setAttribute("version", "1");
	  
	// we have to add visit tag or else we can't know this is POI
	$value = "";
	if (isset($poi->notes) && strlen($poi->notes) && strcmp($poi->notes, 'undefined')) {
	    $value = $poi->notes;
	    // get rid of newlines in tag, looks weird in JOSM
	    $value = str_replace("\n", " ", $value);
	}
	$this->addTag($newnode, "visit", "yes");
        $this->addTag($newnode, "desc", $value);
	$this->addTag($newnode, "name", $this->visit_num++);
    }

    function getTimestamp() {
        return strftime("2010-11-16T04:21:14Z");
    }
}

?>
