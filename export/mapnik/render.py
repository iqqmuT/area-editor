#!/usr/bin/env python

# run this from mapnik directory!

import sys, os
import mapnik2
import cairo
import json
import argparse
import tempfile

#sys.stdout.write("areas: '" + str(areas) + "'\n")
#sys.stdout.write("pois: '" + str(areas) + "'\n")
#sys.exit(0)

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

class StyleParser:
    DEFAULT_STYLE="default"
    UNIT="unit"
    UNIT_CM="cm"
    UNIT_MM="mm"
    UNIT_PX="px"
    UNIT_INCH="in"
    DEFAULT_UNIT=UNIT_PX

    def __init__(self, style_file, style_name):
        styles_file = os.path.join(sys.path[0], style_file)
        f = open(styles_file, 'r')
        data = f.read()
        f.close()
        obj = json.loads(data)
        self.style = obj[style_name or self.DEFAULT_STYLE]

    def get(self, key, default=None):
        return self.style.get(key, default)

    def get_px(self, key, default=None):
        value = self.get(key, default)
        if isinstance(value, list):
            # convert list values
            li = list()
            for v in value:
                li.append(self.to_px(v))
            value = li
        else:
            # convert value
            value = self.to_px(value)
        return value

    def to_px(self, value):
        """Returns value in px and converts units automatically.
           Unit may be told with 'unit' key in styles.json."""
        unit = self.get(self.UNIT, self.DEFAULT_UNIT)
        if unit == self.UNIT_PX:
            return value
        elif unit == self.UNIT_CM:
            return self._cm_to_px(value)
        elif unit == self.UNIT_MM:
            return self._mm_to_px(value)
        elif unit == self.UNIT_INCH:
            return self._inch_to_px(value)

    def _cm_to_px(self, v):
        return int(v * 72 / 2.54)

    def _mm_to_px(self, v):
        return int(v * 72 / 25.4)

    def _inch_to_px(self, v):
        return int(v * 72)

    def _get_unit(self):
        return self.get(self.UNIT, self.DEFAULT_UNIT)

class MapnikRenderer:

    STYLES_FILE="styles.json"
    COPYRIGHT_TEXT="Map data (c) OpenStreetMap contributors, CC-BY-SA"

    def __init__(self, areas):
        self.areas = areas
        self.style = None

    def render(self, style_name, qrcode):
        self.style = StyleParser(self.STYLES_FILE, style_name)

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

        if hasattr(mapnik2,'Box2d'):
            bbox = mapnik2.Box2d(*bounds)
        else:
            bbox = mapnik2.Envelope(*bounds)

        # Set up projections
        # spherical mercator (most common target map projection of osm data imported with osm2pgsql)
        merc = mapnik2.Projection('+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over')

        # long/lat in degrees, aka ESPG:4326 and "WGS 84"
        longlat = mapnik2.Projection('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')
        # can also be constructed as:
        #longlat = mapnik.Projection('+init=epsg:4326')

        # Our bounds above are in long/lat, but our map
        # is in spherical mercator, so we need to transform
        # the bounding box to mercator to properly position
        # the Map when we call `zoom_to_box()`
        self.transform = mapnik2.ProjTransform(longlat,merc)
        self.merc_bbox = self.transform.forward(bbox)

        # auto switch paper and map orientation
        # default orientation in styles is landscape
        self._get_sizes()

        # Create the map
        self.zoom = self.style.get('zoom')
        self.zoom_f = 1 / self.zoom # zoom factor

        self.m = mapnik2.Map(int(self.zoom_f * self.map_size[0]),
                              int(self.zoom_f * self.map_size[1]))
        mapnik2.load_map(self.m, mapfile)

        # ensure the target map projection is mercator
        self.m.srs = merc.params()

        # Mapnik internally will fix the aspect ratio of the bounding box
        # to match the aspect ratio of the target image width and height
        # This behavior is controlled by setting the `m.aspect_fix_mode`
        # and defaults to GROW_BBOX, but you can also change it to alter
        # the target image size by setting aspect_fix_mode to GROW_CANVAS
        #m.aspect_fix_mode = mapnik.GROW_CANVAS
        # Note: aspect_fix_mode is only available in Mapnik >= 0.6.0
        self.m.zoom_to_box(self.merc_bbox)

        # render the map to cairo surface
        surface = cairo.PDFSurface(map_uri, self.paper_size[0], self.paper_size[1])
        self.ctx = cairo.Context(surface)

        # margins
        margin = self.style.get_px('margin')
        self.ctx.translate(margin[0],
                            margin[1])

        # save context before zoom so we can restore it later
        self.ctx.save()

        # apply zoom
        self.ctx.scale(self.zoom, self.zoom)

        # render to context
        mapnik2.render(self.m, self.ctx)
        #self.ctx.restore()

        # draw
        self._draw_areas()

        #placex = mapnik.Coord(*placex_ll)
        #merc_placex = self.transform.forward(placex)
        #view_placex = self.m.view_transform().forward(merc_placex)

        #self.ctx.move_to(view_placex.x - 5, view_placex.y)
        #self.ctx.line_to(view_placex.x + 5, view_placex.y)
        #self.ctx.close_path()

        # set brush color and line width
        self.ctx.set_source_rgba(self.style.get('area_border_color')[0],
                                  self.style.get('area_border_color')[1],
                                  self.style.get('area_border_color')[2],
                                  self.style.get('area_border_color')[3])
        self.ctx.set_line_width(self.style.get('area_border_width'))
        self.ctx.stroke()

        #self.ctx.scale(self.zoom_f, self.zoom_f)
        self.ctx.restore()

        # print copyright text
        self._print_copyright()

        #self.ctx.scale(100, 100)
        if qrcode and self.style.get('qrcode', True):
            self._print_qr_code(qrcode)

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

    """
    Parses STYLES_FILE json file and saves data to self.style.
    """
    #def _parse_styles_file(self, style_name):
    #    styles_file = os.path.join(sys.path[0], self.STYLES_FILE)
    #    f = open(styles_file, 'r')
    #    data = f.read()
    #    f.close()
    #    obj = json.loads(data)
    #    self.style = obj[style_name]

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

    def _print_copyright(self):
        self.ctx.save()
        zoom = 1
        self.ctx.scale(zoom, zoom)
        self.ctx.select_font_face("Sans", cairo.FONT_SLANT_NORMAL,
            cairo.FONT_WEIGHT_NORMAL)
        self.ctx.set_font_size(6)
        margin = self.style.get_px('copyright_margin', [ 3, 3 ])
        x = margin[0]
        y = self.map_size[1] - margin[1]
        self.ctx.move_to(x, y)
        self.ctx.show_text(self.COPYRIGHT_TEXT)
        self.ctx.restore()

    def _print_qr_code(self, qrcode):
        self.ctx.save()
        zoom = 0.2
        self.ctx.scale(zoom, zoom)
        img = cairo.ImageSurface.create_from_png(qrcode)
        margin = self.style.get_px('qrcode_margin', [ 0, 0 ])
        x = int(1 / zoom * self.map_size[0]) - img.get_width() - margin[0]
        y = int(1 / zoom * self.map_size[1]) - img.get_height() - margin[1]
        self.ctx.set_source_surface(img, x, y)
        self.ctx.paint()
        self.ctx.restore()

    def _convert_point(self, latlng):
        coord = self._google_to_mapnik_coord(latlng)
        merc_coord = self.transform.forward(coord)
        view_coord = self.m.view_transform().forward(merc_coord)
        return view_coord

    # Google Maps uses LatLng, Mapnik uses LngLat!
    def _google_to_mapnik_coord(self, latlng):
        coord = mapnik2.Coord(latlng[1], latlng[0])
        return coord

    def _get_sizes(self):
        self.paper_size = self.style.get_px('paper_size')
        self.map_size = self.style.get_px('map_size')
        if self.style.get('orientation') == 'auto' and self.merc_bbox.width() / self.merc_bbox.height() < 1:
            # change orientation
            self.paper_size.reverse()
            self.map_size.reverse()

    def get_output(self):
        return self.output_file


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Mapnik renderer.')
    parser.add_argument('-b', '--bbox', required=True)
    parser.add_argument('-s', '--style', required=False, default=None)
    parser.add_argument('-q', '--qrcode', required=False, default=None)
    args = parser.parse_args()

    #sys.stdout.write("'" + str(args.bbox) + "'\n")

    stdin_data = sys.stdin.read()
    data = json.loads(stdin_data)
    areas = data['areas']
    pois = data['pois']

    r = MapnikRenderer(areas)
    r.render(args.style, args.qrcode)
    fn = r.get_output()
    sys.stdout.write("%s" % fn)

    #m = mapnik.Map(imgx,imgy)
    #mapnik.load_map(m,mapfile)
