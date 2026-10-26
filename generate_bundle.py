import os
import json

data_dir = r"web_app\data"
files = [
    ("kpis", "kpis.json"),
    ("station_stats", "station_stats.json"),
    ("crime_statistics", "crime_statistics.json"),
    ("long_pending_ui", "long_pending_ui.json"),
    ("ps_reported", "ps_reported.json"),
    ("ps_progress", "ps_progress.json"),
    ("ui_cases", "ui_cases.json")
]

bundle_data = {}
for var_name, fname in files:
    path = os.path.join(data_dir, fname)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            bundle_data[var_name] = json.load(f)

js_content = f"// Srikakulam District Police Crime Review Data Bundle\nwindow.CRIME_DATA = {json.dumps(bundle_data, ensure_ascii=False)};\n"
with open(os.path.join(data_dir, "data_bundle.js"), "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"data_bundle.js generated successfully! Size: {len(js_content):,} bytes")
