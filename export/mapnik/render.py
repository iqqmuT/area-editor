#!/usr/bin/env python

# run this from mapnik directory!

import sys, os
import mapnik2
import cairo
import json
import argparse
import tempfile

parser = argparse.ArgumentParser(description='Mapnik renderer.')
parser.add_argument('-b', '--bbox', required=True)
args = parser.parse_args()

#sys.stdout.write("'" + str(args.bbox) + "'\n")

stdin_data = sys.stdin.read()
data = json.loads(stdin_data)
areas = data['areas']
pois = data['pois']

#sys.stdout.write("areas: '" + str(areas) + "'\n")
#sys.stdout.write("pois: '" + str(areas) + "'\n")
#sys.exit(0)

# Set up projections
# spherical mercator (most common target map projection of osm data imported with osm2pgsql)
merc = mapnik2.Projection('+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over')

# long/lat in degrees, aka ESPG:4326 and "WGS 84" 
longlat = mapnik2.Projection('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')
# can also be constructed as:
#longlat = mapnik.Projection('+init=epsg:4326')

# ensure minimum mapnik version
if not hasattr(mapnik2,'mapnik_version') and not mapnik2.mapnik_version() >= 600:
    raise SystemExit('This script requires Mapnik >=0.6.0)')

# Google bounds toString() gives following string:
# ((61.477925877956785, 21.768811679687474), (61.488948601502614, 21.823743320312474))
def googleBoundsToBox2d(google_bounds):
    parts = google_bounds.split(",")
    strip_str = "() "
    min_lat = float(parts[0].strip(strip_str))
    min_lng = float(parts[1].strip(strip_str))
    max_lat = float(parts[2].strip(strip_str))
    max_lng = float(parts[3].strip(strip_str))
    return (min_lng, min_lat, max_lng, max_lat)

class MapnikRenderer:
    def __init__(self, areas):
        self.foo = "moroo"
        self.areas = areas
        
    def render(self, imgx, imgy):

        try:
            mapfile = os.environ['MAPNIK_MAP_FILE']
        except KeyError:
            mapfile = "osm.xml"
    
        (tmp_file_handler, tmp_file) = tempfile.mkstemp()
        map_uri = tmp_file

        #---------------------------------------------------
        #  Change this to the bounding box you want
        #
        # pori city centre
        bounds = googleBoundsToBox2d(args.bbox)
        #placex_ll = (21.7962775, 61.483617)
        #---------------------------------------------------


        self.m = mapnik2.Map(imgx,imgy)
        mapnik2.load_map(self.m, mapfile)

        # ensure the target map projection is mercator
        self.m.srs = merc.params()

        if hasattr(mapnik2,'Box2d'):
            bbox = mapnik2.Box2d(*bounds)
        else:
            bbox = mapnik2.Envelope(*bounds)

        # Our bounds above are in long/lat, but our map
        # is in spherical mercator, so we need to transform
        # the bounding box to mercator to properly position
        # the Map when we call `zoom_to_box()`
        self.transform = mapnik2.ProjTransform(longlat,merc)
        merc_bbox = self.transform.forward(bbox)
    
        # Mapnik internally will fix the aspect ratio of the bounding box
        # to match the aspect ratio of the target image width and height
        # This behavior is controlled by setting the `m.aspect_fix_mode`
        # and defaults to GROW_BBOX, but you can also change it to alter
        # the target image size by setting aspect_fix_mode to GROW_CANVAS
        #m.aspect_fix_mode = mapnik.GROW_CANVAS
        # Note: aspect_fix_mode is only available in Mapnik >= 0.6.0
        self.m.zoom_to_box(merc_bbox)
    
        # render the map to cairo surface
        surface = cairo.PDFSurface(map_uri, self.m.width, self.m.height)
        self.ctx = cairo.Context(surface)
        mapnik2.render(self.m, self.ctx)
    
        # draw
        
        
        self._draw_areas()
        
        #placex = mapnik.Coord(*placex_ll)
        #merc_placex = self.transform.forward(placex)
        #view_placex = self.m.view_transform().forward(merc_placex)

        #self.ctx.move_to(view_placex.x - 5, view_placex.y)
        #self.ctx.line_to(view_placex.x + 5, view_placex.y)
        #self.ctx.close_path()
        self.ctx.stroke()
        surface.finish()

        #sys.stdout.write("%s\n" % map_uri)
        self.output_file = map_uri
    
        # Note: instead of creating an image, rendering to it, and then 
        # saving, we can also do this in one step like:
        # mapnik.render_to_file(m, map_uri,'png')
    
        # And in Mapnik >= 0.7.0 you can also use `render_to_file()` to output
        # to Cairo supported formats if you have Mapnik built with Cairo support
        # For example, to render to pdf or svg do:
        # mapnik.render_to_file(m, "image.pdf")
        #mapnik.render_to_file(m, "image.svg")

    def _draw_areas(self):
        for area in self.areas:
            self._draw_area(area)
    
    def _draw_area(self, area):
        coords = list()
        for coord in area['path']:
            coords.append(self._convert_point(coord))
        if len(coords) < 2:
            pass # area has only one point?

        start = coords.pop()
        self.ctx.move_to(start.x, start.y)
        while len(coords):
            coord = coords.pop()
            self.ctx.line_to(coord.x, coord.y)
        self.ctx.close_path()        
        
    def _convert_point(self, latlng):
        coord = self._google_to_mapnik_coord(latlng)
        merc_coord = self.transform.forward(coord)
        view_coord = self.m.view_transform().forward(merc_coord)
        return view_coord

    # Google Maps uses LatLng, Mapnik uses LngLat!
    def _google_to_mapnik_coord(self, latlng):
        coord = mapnik2.Coord(latlng[1], latlng[0])
        return coord

    def _foo(self):
        sys.stdout.write(self.foo)
        
    def get_output(self):
        return self.output_file


if __name__ == "__main__":

    imgx = 933
    imgy = 600

    r = MapnikRenderer(areas)
    r.render(imgx, imgy)
    fn = r.get_output()
    sys.stdout.write("%s" % fn)
    

    #m = mapnik.Map(imgx,imgy)
    #mapnik.load_map(m,mapfile)
    
    

    
