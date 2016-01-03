#!/bin/bash

#Using caption: and no height spec, only letter size spec, the height is calculated automatically.

# See available fonts with
# convert -list font

cd `dirname $0`

HEADFONT="Ubuntu-Bold"
LINEFONT="Ubuntu-Regular"
HEADPT="24"
THISDIR=`pwd`
TMPDIR=`mktemp -d`
LINEPT="22"
#LINEHGHT="21" # depending on LINEPT: for 13pt, it's 16. for 15pt, it's 21. Try identify header.jpg
BRDCLR="lightgray"

#rm header.jpg notes.jpg line*jpg

cd $TMPDIR

convert \
\( -pointsize $HEADPT  -size 500x -background white -fill black -gravity center -font $HEADFONT caption:"Direcciones" \) \
\( -pointsize $HEADPT  -size 500x -background white -fill black -gravity center -font $HEADFONT caption:"Anotaciones" \) \
-gravity east -background $BRDCLR -splice 1x0 \
 +append -bordercolor $BRDCLR -border 1x1 header.jpg

chght=`identify header.jpg |sed 's/.*JPEG.[0123456789]*x//'|sed 's/ .*//'`

a=0

#  Get the hight of one line, to insert blank lines
convert \
\( -pointsize $LINEPT  -size 500x -background white -fill black -gravity west -font $LINEFONT caption:" " \) \
linetmp.jpg

ONELINEHGHT=`identify linetmp.jpg |sed 's/.*JPEG.[0123456789]*x//'|sed 's/ .*//'`
rm linetmp.jpg

while read i; do

convert \
\( -pointsize $LINEPT  -size 500x -background white -fill black -gravity west -font $LINEFONT caption:"$i" \) \
linetmp.jpg

lhght=`identify linetmp.jpg |sed 's/.*JPEG.[0123456789]*x//'|sed 's/ .*//'`
# Calculate number of lines in the recently generated file
linez=`echo $lhght $ONELINEHGHT /p|dc`
chght=`echo $chght $lhght +p|dc`

#echo Accumulated height $chght

lin=" "
lcnt=1

while [ $lcnt -lt $linez ]; do
 lin="$lin\n"
 let lcnt=lcnt+1
done

convert \
linetmp.jpg \
\( -pointsize $LINEPT  -size 500x -background white -fill black -gravity west -font $LINEFONT caption:"$lin" \) \
-gravity east -background $BRDCLR -splice 1x0 \
 +append -bordercolor $BRDCLR -border 1x1  line$a.jpg

rm linetmp.jpg

let a=a+1
done

# pad with blank lines
while [ $chght -lt 1415 ]; do

convert \
\( -pointsize $LINEPT  -size 500x -background white -fill black -gravity west -font $LINEFONT caption:" " \) \
\( -pointsize $LINEPT  -size 500x -background white -fill black -gravity west -font $LINEFONT caption:" " \) \
-gravity east -background $BRDCLR -splice 1x0 \
 +append -bordercolor $BRDCLR -border 1x1 line$a.jpg

lhght=`identify line$a.jpg |sed 's/.*JPEG.[0123456789]*x//'|sed 's/ .*//'`
chght=`echo $chght $lhght +p|dc`

#echo Accumulated height $chght

let a=a+1
done

rename 's/line/line0/' line?.jpg
rename 's/line/line0/' line0?.jpg

convert header.jpg line*jpg -append -rotate 90 notes.jpg
#eog notes.jpg
rm line*jpg header.jpg

cd "$THISDIR"
TMPNAME=`mktemp -p /var/www/html/toe/imgout/`
mv $TMPDIR/notes.jpg ${TMPNAME}
mv ${TMPNAME} ${TMPNAME}.jpg

rmdir $TMPDIR
echo ${TMPNAME}.jpg |sed 's/.*\//imgout\//'
# 2805111
