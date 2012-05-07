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
 * common.php
 */

include("lib/i18n.php");
include("config.php");

// global vars
$localization = new Localization();
$lang = $localization->lang;
$maplib = $cfg['js_map_library'];
if (isset($_GET['maplib'])) {
    $maplib = $_GET['maplib'];
}

// for convenience, translate function
function tr($str) {
    global $localization;
    return $localization->tr($str);
}

?>
