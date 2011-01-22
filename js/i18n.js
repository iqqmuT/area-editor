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
 * Localization JavaScript file of TOE.
 * 
 */

var lang = 'en';          // selected language (English by default)
var localizations = null; // array of all strings used in TOE JS

function setLanguage(language, json_data) {
  lang = language;
  localizations = json_data;
}

function tr(key, param) {
  if (localizations[key] == undefined) return key;
  
  // if there is '%s' in the string, replace it with given param
  var str = localizations[key];
  return str.replace("%s", param);
}
