<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/> 
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <!--<link type="text/css" href="css/ui-darkness/jquery-ui-1.8.6.custom.css" rel="stylesheet" />-->
    <link type="text/css" href="css/printable.css" rel="stylesheet" />
    <script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false"></script>
    <!--<script type="text/javascript" src="http://code.jquery.com/jquery-1.4.4.min.js"></script>
    <script type="text/javascript" src="js/jquery-ui-1.8.6.custom.min.js"></script>-->
    <!-- <script type="text/javascript" src="js/printable_area.js"></script>-->
    <title>Online area editor - print page</title>
  </head>
  <body>
    <?php printMap(); ?>
  </body>
</html>

<?php

function printMap() {
    if (!strcmp($_POST['map-type'], 'OSM')) {
        printOSMMap();
    }
    else {
        printGoogleMap();
    }
}

function printOSMMap() {
    print 'no osm map support';
}

function printGoogleMap() {
    print '
    <img src="http://maps.google.com/maps/api/staticmap?size=700x700&markers=
icon:http://chart.apis.google.com/chart%3Fchst%3Dd_map_pin_icon%26chld%3Dcafe%257C996600|
224+West+20th+Street|75+9th+Ave|700+E+9th+St&sensor=false">';
}

?>