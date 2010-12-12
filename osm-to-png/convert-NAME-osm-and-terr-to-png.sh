#!/bin/bash
# Create territories with osmosis and openstreetmap
# Copyleft Arno Teigseth

# Syntax (assumes map.osm as OSM background data)
# $0 <territory file>.osm


OSMOSIS=osmosis-0.35/bin/osmosis
TMPDIR=/tmp
BACKGROUNDMAP=map.osm
# should probably get this online in some cases. But for offline use this is great.


# Changes below this line only if you know what you're doing
# ----------------------------------------------------------

cd `dirname $0`
# Creates
# <number>.osm  the territory raw osm data
# <number>.txt  the visits on a list
# <number>.svg  the osmarendered map, SVG (editable)
# <number>.png  the osmarendered map, PNG (basically printable only)


# XXX Should do some stupidity checks here, like check that
# -there's at least one visit in the infile
# -there's at least one area (way) in the infile
# -there are no areas with duplicate names
#
# No need to check if there actually are any points inside the areas.


echo -e "\e[1;31mConvert visits to POI\e[0m"
# Fix ' → ",
# delete timestamp (ugly hack)
# change '<visit="text">' to '<visit="yes"> <desc="text">'
# add fake timestamp and version (bugs in josm: don't [always] add timestamps/versions)
cat $1 \
| sed "s/'/\"/g"\
| sed "s/-12908/-/g"\
| grep -v "k=\"address\"" \
| grep -v "k=\"name\"" \
| sed "s/timestamp..[0-9T:-]*Z. / /g" \
| sed "s/visit./visit\" v=\"yes\" \/><tag k=\"desc\" /g" \
| sed "s/id=/timestamp=\"2010-11-16T04:21:14Z\" version=\"1\" id=/" > $TMPDIR/pois.osm


# [OPTIONAL] Get an updated piece of osm street data from openstreetmap and save it as $BACKGROUNDMAP

# 3 Merge the complete territory with the osm map data
echo -e "\e[1;31mMerge background map with POIs\e[0m"
$OSMOSIS --read-xml file=$TMPDIR/pois.osm --sort-0.6 --read-xml file=$BACKGROUNDMAP --sort-0.6 --merge --write-xml file=$TMPDIR/teobig.osm



# Choose what polygon to use for cutting
# XXX CAVEAT: The pattern below in the sed
dialog --menu "Select territory to generate" 15 20 7 `cat $1 | tr "\n" " "| sed "s/'/\"/g" |sed 's/\(..way.\)/\n\1/g' |grep "<way"|sed 's/^.*k="name" *v="\([^"]*\)".*k=.number" *v="\([^"]*\).*/\2|\1/'|sed 's/ /_/g'|sed 's/|/ /g'` 2> $TMPDIR/chosen

# start mask file
echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<osm version=\"0.6\" generator=\"JOSM\">" > $TMPDIR/mask
# get area nodes, all of them
cat $1 |grep "<node[^<].*\/>" >> $TMPDIR/mask

nro=`cat $TMPDIR/chosen`
cat $1 | tr "\n" " "|sed 's/\(..way.\)/\n\1/g' |grep "<way"|grep "number.....$nro" >> $TMPDIR/mask
echo "</way></osm>" >> $TMPDIR/mask

echo -e "\e[1;31mConvert terr-area to MASK\e[0m"
#cat $2 \
cat $TMPDIR/mask \
| sed "s/'/\"/g"\
| sed "s/<node i/<node version=\"1\" i/"\
| sed 's/\/>/\/>\n/g'\
| grep -v "k=\"number\"" \
| grep -v "k=\"name\"" > $TMPDIR/mask.osm

# Create polygon file from territory mask file (simple path with no tags)
echo -e "\e[1;31mConvert mask to POLY\e[0m"
cat $TMPDIR/mask.osm  |grep -v 'k="area"' |./osm2poly.pl  > $TMPDIR/terr-mask.poly



echo -e "\e[1;31mCut out territory using POLY\e[0m"
# 4 Chop the teobig.osm into pieces using data from a mask overlay osm file (territorymask.osm). The relations "territory" are limits.
$OSMOSIS --read-xml file="$TMPDIR/teobig.osm" --bounding-polygon file="$TMPDIR/terr-mask.poly" completeWays="yes" --write-xml file="$TMPDIR/merged.osm"


# Enumerate visits
echo -e "\e[1;31mEnumerate visits\e[0m"
cat $TMPDIR/merged.osm |tr "\n" " " |sed 's/\(\/[a-z][a-z]*>\)/\1\n/g' | ./enumeratePOI.sh > $nro.osm

echo -e "\e[1;31mExtract visits\e[0m"
cat $nro.osm \
| tr "\n" " "\
| sed 's/<\/node>/\n/g'\
| grep visit \
| sed 's/^.*desc.....//'\
| sed 's/".*v=.\([0-9]*\).*/|\1/' \
| sed 's/\(^.*\)|\(.*\)/\2|\1/'> $nro.txt

echo -e "\e[1;31mRender SVG\e[0m"
cp $nro.osm osmarender/xslt/data.osm
backdir=`pwd`
cd osmarender/xslt/
xsltproc osmarender.xsl terriz17.xml > $nro.svg
cd $backdir
mv osmarender/xslt/$nro.svg .

echo -e "\e[1;31mRender PNG\e[0m"
# rsvg-convert -d 300 -p 300 -x 10 -y 10 -o $3.png -a --background-color=black $3.svg  && eog $3.png
# OOPS, rsvg seems to have no text on path support. Have to install the 100MB sized inkscape...

inkscape -e $nro.png -d 1200 -D $nro.svg


echo -e "\e[1;31mCreate HTML\e[0m"
echo "<html><body><img src=\"$nro.png\" width=\"1000\"><table border=1>" > $nro.html
echo "<th>Visit<th>Address<th>Observations" >> $nro.html
cat $nro.txt |sed 's/^\(.*\)|\(.*\)/<tr><td>\1<\/td><td>\2<\/td><td>\&nbsp;<\/td><\/tr>/' >> $nro.html
echo "</table></body></html>" >> $nro.html

echo -e "\e[1;31mFinished creating $nro\e[0m"

#Now Bob's your uncle and Mary's your aunt.
cat $nro.txt
eog $nro.png &
#firefox $nro.html &


#XXX should do some garbage collection here. Leaving the temp files for debugging purposes for the moment.

