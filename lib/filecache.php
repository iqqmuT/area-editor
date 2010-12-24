<?php

// Simple file caching class.
// Removes expired files from cache directory automatically.

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
