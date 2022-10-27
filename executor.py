# runs on device

import json
import os
import threading

from flask import Flask, jsonify, render_template, request
import requests


MAX_VOLUME = 20 #300
DROP_VOLUME = 2
ALL_COLORS = ["red", "orange", "yellow", "green", "blue", "purple"] #, "black"] # don't print white

TOKEN = os.environ.get("TOKEN")


current_task = None

BASE_URL = "https://artstudio.pylabrobot.org"

def mark_task(task_id, status):
  requests.put(f"{BASE_URL}/pieces/status?token={TOKEN}", json={"status": status, "id": task_id})

##### liquid handling #####

from pylabrobot.liquid_handling import LiquidHandler
from pylabrobot.liquid_handling.backends.opentrons_backend import OpentronsBackend
from pylabrobot.liquid_handling.resources.opentrons import OTDeck

ot = OpentronsBackend(host="0.0.0.0", port=5001) #10.31.56.221
lh = LiquidHandler(backend=ot, deck=OTDeck())

lh.setup()

from pylabrobot.liquid_handling.resources.opentrons import (
    opentrons_96_filtertiprack_20ul,
)
from pylabrobot.liquid_handling.resources.corning_costar import (
    Cos_96_EZWash
)
from pylabrobot.liquid_handling.resources.opentrons import corning_6_wellplate_16point8ml_flat
from pylabrobot.liquid_handling.resources import Plate, create_equally_spaced, Well

def PaintPlate(name: str, with_lid: bool = False) -> Plate: # Cos_96_EZWash
  return Plate(
    name=name,
    size_x=127.0,
    size_y=86.0,
    size_z=14.5,
    one_dot_max=11.3,
    with_lid=with_lid,
    lid_height=10,
    compute_volume_from_height=None,
    items=create_equally_spaced(Well,
      num_items_x=12,
      num_items_y=8,
      dx=14.0,
      dy=11.5,
      dz=1.0, #+ 120,
      item_size_x=9.0,
      item_size_y=9.0,
    ),
  )

plate = Cos_96_EZWash(name="plate")

plate = PaintPlate(name="plate")

lh.deck.assign_child_resource(plate, slot=1)

tips = opentrons_96_filtertiprack_20ul(name="300")
dirty_tips = opentrons_96_filtertiprack_20ul(name="dirty")

lh.deck.assign_child_resource(tips, slot=8)
lh.deck.assign_child_resource(dirty_tips, slot=9)

reservoirs = corning_6_wellplate_16point8ml_flat(name="reservoirs")

reservoirs.get_item("A1")._size_z -= 15
reservoirs.get_item("A2")._size_z -= 15
reservoirs.get_item("A3")._size_z -= 15
reservoirs.get_item("B1")._size_z -= 15
reservoirs.get_item("B2")._size_z -= 15
reservoirs.get_item("B3")._size_z -= 15

red_well = reservoirs.get_item("A1")
orange_well = reservoirs.get_item("A2")
yellow_well = reservoirs.get_item("A3")
blue_well = reservoirs.get_item("B1")
green_well = reservoirs.get_item("B2")
purple_well = reservoirs.get_item("B3")

lh.deck.assign_child_resource(reservoirs, slot=3)

tip_idx = 0
def print_piece(piece):
  global tip_idx
  try:
    data = piece["content"]
    data = json.loads(data)

    color2well = {
      "red": red_well,
      "orange": orange_well,
      "yellow": yellow_well,
      "green": green_well,
      "blue": blue_well,
      "purple": purple_well,
    }

    colors = ALL_COLORS.copy()
    # sort colors by frequency in data
    flattened_data = [item for sublist in data for item in sublist]
    colors.sort(key=lambda c: flattened_data.count(c), reverse=True)

    for color in colors:
      # Get all the wells with a given color
      masked = []
      i = 0
      for row in data:
        for well in row:
          if well == color:
            masked.append((i, row.index(well))) # can this just be i?
          i += 1

      if len(masked) == 0:
        continue

      items = masked

      print("batches for ", color)

      # pick up tip
      lh.pick_up_tips(tips[tip_idx])

      # loop over items in batches of (MAX_VOLUME / DROP_VOLUME)
      for i in range(0, len(items), MAX_VOLUME // DROP_VOLUME):
        batch = items[i:i + MAX_VOLUME // DROP_VOLUME]
        print("  aspirate", len(batch), len(batch) * DROP_VOLUME)
        # TODO: lh.aspirate should support single well too
        lh.aspirate([color2well[color]], vols=[len(batch) * DROP_VOLUME], liquid_classes=None)
        for item in batch:
          print("    dispense", item[0], DROP_VOLUME)
          lh.dispense(plate[item[0]], vols=[DROP_VOLUME], offsets_z=5, flow_rates=[30], liquid_classes=None)

      # discard tip
      lh.discard_tips(dirty_tips[tip_idx])
      tip_idx += 1

      print("===")

    mark_task(piece["id"], "done")
  except Exception as e:
    import traceback
    print(traceback.format_exc())
    print("error", e)
    mark_task(piece["id"], "failed")

  global current_task
  current_task = None


##### front end #####

app = Flask(__name__, template_folder=".", static_folder="static")

@app.route("/")
def index():
  return render_template("dashboard.html")


@app.route("/token")
def get_token():
  return jsonify(token=TOKEN)


@app.route("/start", methods=["POST"])
def start():
  global current_task
  if current_task is not None:
    return jsonify({"error": "already running a task"})

  current_task = dict(request.get_json())

  mark_task(current_task["id"], "running")

  # should print in a separate thread
  print("printing piece")

  thread = threading.Thread(target=print_piece, args=(current_task,))
  thread.start()

  return jsonify({"success": True})


@app.route("/delete", methods=["POST"])
def delete():
  task_id = request.get_json()["id"]
  requests.delete(f"{BASE_URL}/pieces/{task_id}?token={TOKEN}")
  return jsonify({"success": True})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5006)#, debug=True)
