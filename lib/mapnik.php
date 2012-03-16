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

// SVG using Osmarender
class MapnikRender {
    public $pois, $areas, $bounds, $style, $output_file, $error;
  
    function __construct($pois, $areas, $bounds, $style) {
        $this->pois = $pois;
        $this->areas = $areas;
        $this->bounds = $bounds;
        $this->style = $style;
    }

    function render() {

        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
            1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
            2 => array("file", "/tmp/error-output.txt", "a") // stderr is a file to write to
        );

        $cwd = $cfg['mapnik_path'];

        $process = proc_open('../pori-gfx.py eka toka', $descriptorspec, $pipes, $cwd);

        $return_value = -1;
        if (is_resource($process)) {
            // $pipes now looks like this:
            // 0 => writeable handle connected to child stdin
            // 1 => readable handle connected to child stdout
            // Any error output will be appended to /tmp/error-output.txt

            fwrite($pipes[0], 'kakkamakkarassa');
            fclose($pipes[0]);

            $output = stream_get_contents($pipes[1]);
            fclose($pipes[1]);

            // It is important that you close any pipes before calling
            // proc_close in order to avoid a deadlock
            $return_value = proc_close($process);

            //echo "command returned $return_value\n";
        }

        if ($return_value == 0) {
            $this->output_file = "/tmp/pori-gfx.pdf";
            //$output = file_get_contents($output_file);
            return true;
        }

        $this->error = "rikkipikki!";
        return false;
        /*

      
        $dir = "/home/tumppi/projects/mapnik/mapnik";
        $python = "/usr/bin/python";
        $file = "/home/tumppi/projects/mapnik/pori-gfx.py";

        chdir($dir);
        $cmd = "$python $file";
        exec($cmd);*/

    }

    function output() {
        $output = file_get_contents($this->output_file);
        return $output;
    }

}

?>
