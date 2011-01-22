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
 * Localization class.
 *
 * Determining the language happens in this priority:
 *  1) "lang" get parameter
 *  2) language setting cookie
 *  3) detect browser language
 */

class Localization {
    public $lang = 'en'; // by default the language is English
    public $lang_dir = "lang/";
    public $available_languages;
    private $dictionaries;
    
    public function __construct() {
        $this->get_available_languages();
        $this->read_dictionaries();
        if (isset($_GET['lang']) && in_array($_GET['lang'], $this->available_languages)) {
            // GET param 'lang' was found, and we even support given lang
            $this->lang = $_GET['lang'];
        } elseif (isset($_COOKIE['lang'])) {
            // we found language setting cookie, let's use it
            $this->lang = $_COOKIE['lang'];
        }
        else {
            // detect browser language
            $this->lang = $this->detect_browser_language();
        }
    }

    // localize given string
    public function tr($str) {
        $translations = $this->dictionaries[$this->lang];
        if (isset($translations[$str]))
            return $translations[$str];
        return $str; // no translation
    }

    public function read_lang_file($lang) {
        $lang_file = $this->lang_dir . $lang . ".json";
        if (!file_exists($lang_file)) {
            // fallback to English
            $lang_file = $this->lang_dir . "en.json";
        }
        return file_get_contents($lang_file);
    }
    
    // this is for settings dialog
    public function print_language_options() {
        $html = "";
        $dicts = $this->dictionaries;
        asort($dicts); // sort the language options
        foreach ($dicts as $lang => $dictionary) {
            $html .= '<option value="' . $lang . '"';
            // mark the current language
            if (!strcmp($lang, $this->lang)) $html .= ' selected="selected"';
            $html .= '>';
            $html .= $dictionary['lang'];
            $html .= '</option>';
        }
        return $html;
    }
    
    // browse through $lang_dir and see what languages we have available
    // "en" should be the first element in returned array
    private function get_available_languages() {
        $this->available_languages = array("en"); // english should be the first element, it's the default
        $dh = opendir($this->lang_dir);
        while (($file = readdir($dh)) !== false) {
            $len = strlen($file);
            // filter only those files which end with ".json"
            // ignore en.json, it should be there already
            $pos = strrpos($file, ".json");
            if ($len > 5 && $pos == $len - 5 && strcmp($file, "en.json"))
                $this->available_languages[] = strtolower(substr($file, 0, $pos));
        }
        closedir($dh);
    }
    
    // Read all json files from language directory to memory.
    private function read_dictionaries() {
        $this->dictionaries = array();
        foreach ($this->available_languages as $lang) {
            $content = $this->read_lang_file($lang);
            $dictionary = json_decode($content, true);
            $this->dictionaries[$lang] = $dictionary;
        }
    }

    // following function based on comment at:
    // http://www.php.net/manual/en/function.http-negotiate-language.php
    /* 
      determine which language out of an available set the user prefers most
      
      $available_languages        array with language-tag-strings (must be lowercase) that are available
      $http_accept_language    a HTTP_ACCEPT_LANGUAGE string (read from $_SERVER['HTTP_ACCEPT_LANGUAGE'] if left out)
    */
    private function detect_browser_language() {
        // if $http_accept_language was left out, read it from the HTTP-Header
        $http_accept_language = $_SERVER['HTTP_ACCEPT_LANGUAGE'];

        // standard  for HTTP_ACCEPT_LANGUAGE is defined under 
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
        // pattern to find is therefore something like this:
        //    1#( language-range [ ";" "q" "=" qvalue ] )
        // where:
        //    language-range  = ( ( 1*8ALPHA *( "-" 1*8ALPHA ) ) | "*" )
        //    qvalue         = ( "0" [ "." 0*3DIGIT ] )
        //            | ( "1" [ "." 0*3("0") ] )
        preg_match_all("/([[:alpha:]]{1,8})(-([[:alpha:]|-]{1,8}))?" . 
                      "(\s*;\s*q\s*=\s*(1\.0{0,3}|0\.\d{0,3}))?\s*(,|$)/i", 
                      $http_accept_language, $hits, PREG_SET_ORDER);

        // default language (in case of no hits) is the first in the array
        $available_languages = $this->available_languages;
        $bestlang = $available_languages[0];
        $bestqval = 0;

        foreach ($hits as $arr) {
            // read data from the array of this hit
            $langprefix = strtolower ($arr[1]);
            if (!empty($arr[3])) {
                $langrange = strtolower ($arr[3]);
                $language = $langprefix . "-" . $langrange;
            }
            else $language = $langprefix;
            $qvalue = 1.0;
            if (!empty($arr[5])) $qvalue = floatval($arr[5]);
      
            // find q-maximal language  
            if (in_array($language,$available_languages) && ($qvalue > $bestqval)) {
                $bestlang = $language;
                $bestqval = $qvalue;
            }
            // if no direct hit, try the prefix only but decrease q-value by 10% (as http_negotiate_language does)
            else if (in_array($langprefix,$available_languages) && (($qvalue*0.9) > $bestqval)) {
                $bestlang = $langprefix;
                $bestqval = $qvalue*0.9;
            }
        }
        return $bestlang;
    }
}
?>
