<html>
  <head>
    <title>Export tester</title>
  </head>
  <body>
    <form action="export/" method="POST">
      
      format: <input type="radio" name="format" value="pdf" checked="checked" /> PDF</br>
      style: <input type="text" name="style" value="default" /></br>
      bbox: <input type="text" name="bbox" value="((61.477925877956785, 21.768811679687474), (61.488948601502614, 21.823743320312474))" size="30" /><br/>
      areas: <textarea name="areas" style="width:500px; height:300px">[{"id":"-56689962","number":"","name":"","path":[[61.48484114681654,21.7956337698364],[61.485742579804125,21.798208690490696],[61.48452359034185,21.799496150817845],[61.48440066438516,21.796427703704808]]}]</textarea><br/>
      <br/>
      <input type="hidden" name="pois" value="[]" />
      <input type="submit" name="submit" value="Submit">
    </form>
  </body>
</html>
