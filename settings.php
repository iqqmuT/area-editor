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
 * settings.php
 *
 * Returns JSON object.
 */

$data = array();

$data['changed'] = false;

$old_lang = $_GET['language_old'];
$new_lang = $_GET['language_new'];
if (strcmp($old_lang, $new_lang)) {
    // language setting changed
    $data['changed'] = true;
    $data['redirect_url'] = "?lang=" . $new_lang;
}
// save language setting even though it was not changed
save_setting("lang", $new_lang);

// print response as JSON object
print json_encode($data);

// functions
// ---------

// save setting to a cookie
function save_setting($key, $value) {
    // set cookie epxire time to be expired on 2 year 
    $expire = time() + (60 * 60 * 24 * 365 * 2);
    setcookie($key, $value, $expire);
}

?>

