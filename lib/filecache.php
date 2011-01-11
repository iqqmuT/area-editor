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
 * Simple file caching class.
 * Removes expired files from cache directory automatically.
 */

class FileCache {
    private $path, $expiration_time;
    
    public function __construct() {
        $this->path = "cache/";
	$this->expiration_time = 15 * 60; // cache will be expired in 15 mins by default
    }
    
    public function add($orig, $file) {
        $this->clean();
        copy($orig, $this->path . $file);
    }
    
    public function get($file) {
        $file = $this->path . $file;
        if (file_exists($file)) {
	    return $file;
	}
	return false; // given file not found from cache
    }   
    
    // removes expired files from cache
    private function clean() {
        $files = array();
	$dh = opendir($this->path);
	while (($file = readdir($dh)) !== false) {
	    array_push($files, $file);
        }
        closedir($dh);
	foreach ($files as $file) {
	    if (strcmp($file, ".") && strcmp($file, "..")) {
	        $filename = $this->path . $file;
		if ($this->is_expired($filename)) {
		    unlink($filename);
		}
	    }
	}
    }

    // if file's modification time is older than expiration time, return true
    private function is_expired($file) {
        $now = time();
        $mtime = filemtime($file);
	return ($now - $mtime >= $this->expiration_time);
    }
}

?>
