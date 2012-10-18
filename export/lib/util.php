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
 * util funcs
 */

class Util {

    // parses string "((-37.43997405227057, -126.5625), (37.43997405227057, 126.5625))"
    public static function parse_bounds($bounds) {
        $parts = explode(',', $bounds);
        for ($i = 0; $i < count($parts); $i++) {
            $parts[$i] = trim($parts[$i], " ()");
        }
        $bounds_arr = array(array($parts[0], $parts[1]),
                            array($parts[2], $parts[3]));
        return $bounds_arr;
    }

    // QR code needs phpqrcode installed to export/lib/phpqrcode/
    // http://sourceforge.net/projects/phpqrcode/files/releases/phpqrcode-2010100721_1.1.4.zip/download
    public static function generate_qrcode($url) {
        $included = @include("phpqrcode/phpqrcode.php");
        if ($included !== false) {
            $png = tempnam('/tmp/', 'qrcode');
            QRCode::png($url, $png, 'L', 4, 2);
            if (filesize($png) > 0) {
                // QR code generated
                return $png;
            }
            // QR code generation failed
            unlink($png);
        }
        return false;
    }

}

?>
