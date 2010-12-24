<?php
// util functions
// parses string "((-37.43997405227057, -126.5625), (37.43997405227057, 126.5625))"
function parse_bounds($bounds) {
    $parts = explode(',', $bounds);
    for ($i = 0; $i < count($parts); $i++) {
        $parts[$i] = trim($parts[$i], " ()");
    }
    $bounds_arr = array(array($parts[0], $parts[1]),
                        array($parts[2], $parts[3]));
    return $bounds_arr;
}

?>
