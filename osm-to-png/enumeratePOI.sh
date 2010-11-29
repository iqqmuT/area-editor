#!/bin/bash

# Automatically number pois adding a name tag.
i=0
while read line; do
   visitnode=1
#   if [[ "$line" =~ "<node>" ]]; then
      if [[ "$line" =~ "k=\"visit\"" ]]; then
         let i++
         echo $line | sed "s/<\/node>/<tag k=\"name\" v=\"$i\" \/><\/node>/"
#         visitnode=0
      else
#         visitnode=1
         echo "$line"
     fi
#  else
#         echo "$line"
 # fi

#   if [[ "$line" =~ "</node>" ]]; then
#      if [ $visitnode ]; then
#         let i++
#         echo "<tag k='name' v='$i' />$line"
#         echo $line | sed "s/<\/node>/<tag k=\"name\" v=\"$i\" \/><\/node>/"
#      else
#         echo "$line"
#      fi
#   else
#      echo "$line"
#   fi
#done < $1 > $2
done
