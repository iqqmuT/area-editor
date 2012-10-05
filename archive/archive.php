<?php
/*
 * Copyright 2012 Arno Teigseth, Tuomas Jaakola
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
 */

class Archive {

    protected $db;

    public function __construct($file) {
        $this->db = new SQLite3($file);
        $this->createTable();
    }

    private function createTable() {
        $sql = "create table if not exists areas (
id varchar(32) primary key,
data blob not null,
views int default 0,
last_access timestamp,
created timestamp default current_timestamp
)";
        $this->db->exec($sql);
    }

    public function read($id) {
        $sql = "select data from areas where id='$id'";
        $data = $this->db->querySingle($sql);
        if ($data !== false) {
            $sql = "update areas set views=views+1,
last_access=current_timestamp where id='$id'";
            $this->db->exec($sql);
            return $data;
        }
        return false;
    }

    public function write($data) {
        $id = md5($data);
        $sql = "insert or ignore into areas (id, data) values ('$id', '";
        $sql .= $this->db->escapeString($data) . "')";
        $this->db->exec($sql);
        return $id;
    }
}

?>
