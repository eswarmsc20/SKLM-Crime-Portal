import os
import json
import pandas as pd
import numpy as np

base_dir = r"extracted_data\Point-1 & 2 All Head-wise Grave & Non-Grave UI Cases-upto"
out_dir = r"web_app\data"
os.makedirs(out_dir, exist_ok=True)

def clean_val(v):
    if pd.isna(v):
        return None
    if isinstance(v, (pd.Timestamp, pd.DatetimeIndex)):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        return float(v)
    s = str(v).strip()
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s

print("--- 1. Processing 1A. Total UI Cases ---")
f_1a = os.path.join(base_dir, r"Total Cases\1A. Total UI Cases.xlsx")
df_1a = pd.read_excel(f_1a, sheet_name="Total")

ui_cases = []
for idx, r in df_1a.iterrows():
    fir = clean_val(r.get("FIR NO"))
    ps = clean_val(r.get("Police Station"))
    if not fir or not ps:
        continue
    
    col_head = [c for c in df_1a.columns if "Head" in str(c) and "Crime" in str(c)]
    crime_head = clean_val(r.get(col_head[0])) if col_head else clean_val(r.get("Crime Head"))
    
    case = {
        "id": int(r.get("S.NO", idx + 1)) if pd.notna(r.get("S.NO")) else idx + 1,
        "sub_division": clean_val(r.get("Sub-Division")),
        "circle": clean_val(r.get("Cirlce")),
        "ps": ps,
        "io_name": clean_val(r.get("I.O Name")),
        "fir_no": fir,
        "sec_of_law": clean_val(r.get("ACTS & SEC")),
        "fir_date": clean_val(r.get("FIR DT")),
        "month": clean_val(r.get("Month")),
        "year": clean_val(r.get("Year")),
        "crime_head": crime_head,
        "sub_head": clean_val(r.get("Sub-Head")),
        "classification": clean_val(r.get("Crime Classfication")),
        "act_type": clean_val(r.get("Act Type")),
        "gravity": clean_val(r.get("Gravity Type")),
        "stage": clean_val(r.get("Stage")),
        "reason_for_ui": clean_val(r.get("Reason for UI")),
        "days_pending": clean_val(r.get("No. of Days")),
        "timeline": clean_val(r.get("Time Line")),
        "timeline_actual": clean_val(r.get("Time Line Actual UI Cases")),
        "brief": clean_val(r.get("Brief")),
        "is_long_pending": True if str(clean_val(r.get("Total Long Pending Cases"))).lower() in ["yes", "ui", "1"] else False
    }
    ui_cases.append(case)

print(f"Loaded {len(ui_cases)} UI cases.")
with open(os.path.join(out_dir, "ui_cases.json"), "w", encoding="utf-8") as f:
    json.dump(ui_cases, f, ensure_ascii=False)

print("--- 2. Processing 2A. Long Pending UI Cases ---")
f_2a = os.path.join(base_dir, r"Total Cases\2A. Long Pending UI Cases.xlsx")
df_2a = pd.read_excel(f_2a, sheet_name="Total")

long_pending_ui = []
for idx, r in df_2a.iterrows():
    fir = clean_val(r.get("FIR NO"))
    ps = clean_val(r.get("Police Station"))
    if not fir or not ps:
        continue
    col_head = [c for c in df_2a.columns if "Head" in str(c) and "Crime" in str(c)]
    crime_head = clean_val(r.get(col_head[0])) if col_head else clean_val(r.get("Crime Head"))
    
    case = {
        "id": int(r.get("S.NO", idx + 1)) if pd.notna(r.get("S.NO")) else idx + 1,
        "sub_division": clean_val(r.get("Sub-Division")),
        "circle": clean_val(r.get("Cirlce")),
        "ps": ps,
        "io_name": clean_val(r.get("I.O Name")),
        "fir_no": fir,
        "sec_of_law": clean_val(r.get("ACTS & SEC")),
        "fir_date": clean_val(r.get("FIR DT")),
        "month": clean_val(r.get("Month")),
        "year": clean_val(r.get("Year")),
        "crime_head": crime_head,
        "classification": clean_val(r.get("Crime Classfication")),
        "gravity": clean_val(r.get("Gravity Type")),
        "stage": clean_val(r.get("Stage")),
        "reason_for_ui": clean_val(r.get("Reason for UI")),
        "days_pending": clean_val(r.get("No. of Days")),
        "timeline": clean_val(r.get("Time Line")),
        "brief": clean_val(r.get("Brief"))
    }
    long_pending_ui.append(case)

print(f"Loaded {len(long_pending_ui)} Long Pending UI cases.")
with open(os.path.join(out_dir, "long_pending_ui.json"), "w", encoding="utf-8") as f:
    json.dump(long_pending_ui, f, ensure_ascii=False)

print("--- 3. Processing 4. Head Wise Abstract - Crime Statistics ---")
f_4 = os.path.join(base_dir, r"Total Cases\4. Head Wise Abstract.xlsx")
df_stats = pd.read_excel(f_4, sheet_name="Crime Statistics ")

stats_list = []
for idx in range(1, len(df_stats)):
    row = df_stats.iloc[idx]
    sno = clean_val(row.iloc[0])
    head = clean_val(row.iloc[1])
    if not head or str(sno).lower() in ["nan", "none"] and str(head).lower() in ["nan", "none"]:
        continue
    
    y24 = clean_val(row.iloc[3]) if len(row) > 3 else 0
    y25 = clean_val(row.iloc[4]) if len(row) > 4 else 0
    y26 = clean_val(row.iloc[5]) if len(row) > 5 else 0
    p_24_25 = clean_val(row.iloc[6]) if len(row) > 6 else 0
    p_25_26 = clean_val(row.iloc[7]) if len(row) > 7 else 0
    
    stats_list.append({
        "sno": str(sno),
        "head": str(head),
        "category": clean_val(row.iloc[2]) if len(row) > 2 else "",
        "y2024": int(float(y24)) if y24 is not None and str(y24).replace('.','',1).isdigit() else 0,
        "y2025": int(float(y25)) if y25 is not None and str(y25).replace('.','',1).isdigit() else 0,
        "y2026": int(float(y26)) if y26 is not None and str(y26).replace('.','',1).isdigit() else 0,
        "pct_24_25": round(float(p_24_25) * 100, 1) if p_24_25 is not None and isinstance(p_24_25, (int, float)) else 0,
        "pct_25_26": round(float(p_25_26) * 100, 1) if p_25_26 is not None and isinstance(p_25_26, (int, float)) else 0
    })

print(f"Loaded {len(stats_list)} crime statistics records.")
with open(os.path.join(out_dir, "crime_statistics.json"), "w", encoding="utf-8") as f:
    json.dump(stats_list, f, ensure_ascii=False)

print("--- 4. Processing 4. Head Wise Abstract - Reported vs Finalised by PS ---")
df_rep = pd.read_excel(f_4, sheet_name="Reported")
ps_reported = []
for idx, r in df_rep.iterrows():
    ps = clean_val(r.get("Name of the PS"))
    if not ps or str(ps).lower() in ["nan", "none", "total"]:
        continue
    rep = clean_val(r.get("Reported"))
    fin = clean_val(r.get("Finalised"))
    ps_reported.append({
        "ps": ps,
        "reported": int(float(rep)) if rep is not None and str(rep).replace('.','',1).isdigit() else 0,
        "finalised": int(float(fin)) if fin is not None and str(fin).replace('.','',1).isdigit() else 0
    })

print(f"Loaded {len(ps_reported)} PS reported/finalised records.")
with open(os.path.join(out_dir, "ps_reported.json"), "w", encoding="utf-8") as f:
    json.dump(ps_reported, f, ensure_ascii=False)

print("--- 5. Processing 1B. UI Cases Compliance - PS Wise Progress ---")
f_1b = os.path.join(base_dir, r"Total Cases\1B. UI Cases Compliance.xlsx")
df_ps_prog = pd.read_excel(f_1b, sheet_name="PS Wise-Progress")

ps_progress = []
for idx in range(2, len(df_ps_prog)):
    r = df_ps_prog.iloc[idx]
    reason_label = clean_val(r.iloc[1])
    ps_name = clean_val(r.iloc[28]) if len(r) > 28 else None
    tot = clean_val(r.iloc[2])
    pt_disp = clean_val(r.iloc[3])
    sc_awaite = clean_val(r.iloc[4])
    cs_returned = clean_val(r.iloc[5])
    arrest = clean_val(r.iloc[6])
    charged = clean_val(r.iloc[7])
    present_ui = clean_val(r.iloc[24]) if len(r) > 24 else None
    actual_ui = clean_val(r.iloc[25]) if len(r) > 25 else None
    
    if reason_label:
        ps_progress.append({
            "sno": idx - 1,
            "old_reason": reason_label,
            "total_prev": int(tot) if tot is not None and str(tot).isdigit() else 0,
            "disposed": int(pt_disp) if pt_disp is not None and str(pt_disp).isdigit() else 0,
            "cc_awaited": int(sc_awaite) if sc_awaite is not None and str(sc_awaite).isdigit() else 0,
            "cs_returned": int(cs_returned) if cs_returned is not None and str(cs_returned).isdigit() else 0,
            "for_arrest": int(arrest) if arrest is not None and str(arrest).isdigit() else 0,
            "being_charged": int(charged) if charged is not None and str(charged).isdigit() else 0,
            "present_ui": int(present_ui) if present_ui is not None and str(present_ui).isdigit() else 0,
            "actual_ui": int(actual_ui) if actual_ui is not None and str(actual_ui).isdigit() else 0,
            "ps_sample": ps_name
        })

with open(os.path.join(out_dir, "ps_progress.json"), "w", encoding="utf-8") as f:
    json.dump(ps_progress, f, ensure_ascii=False)

print("--- 6. Computing Station Breakdown & Aggregates ---")
station_stats = {}
subdivision_stats = {}

for c in ui_cases:
    ps = c["ps"]
    sd = c["sub_division"] or "Other"
    cir = c["circle"] or "Other"
    
    if ps not in station_stats:
        station_stats[ps] = {
            "ps": ps,
            "sub_division": sd,
            "circle": cir,
            "total_ui": 0,
            "grave": 0,
            "non_grave": 0,
            "above_1yr": 0,
            "long_pending": 0,
            "cc_awaited": 0,
            "want_of_clues": 0,
            "arrest_pending": 0,
            "reasons": {},
            "heads": {},
            "ios": {}
        }
    
    st = station_stats[ps]
    st["total_ui"] += 1
    if str(c["gravity"]).lower() == "grave":
        st["grave"] += 1
    else:
        st["non_grave"] += 1
        
    if "above 1 year" in str(c["timeline"]).lower():
        st["above_1yr"] += 1
    if c["is_long_pending"]:
        st["long_pending"] += 1
        
    reas = c["reason_for_ui"] or "Unspecified"
    st["reasons"][reas] = st["reasons"].get(reas, 0) + 1
    if "cc no" in reas.lower() or "sc/prc" in reas.lower():
        st["cc_awaited"] += 1
    elif "clues" in reas.lower():
        st["want_of_clues"] += 1
    elif "arrest" in reas.lower():
        st["arrest_pending"] += 1
        
    hd = c["crime_head"] or "Other"
    st["heads"][hd] = st["heads"].get(hd, 0) + 1
    
    io = c["io_name"] or "SHO"
    st["ios"][io] = st["ios"].get(io, 0) + 1

# Merge reported & finalised into station_stats
rep_map = {p["ps"].lower(): p for p in ps_reported}
for ps, st in station_stats.items():
    match = rep_map.get(ps.lower())
    if match:
        st["reported"] = match["reported"]
        st["finalised"] = match["finalised"]
    else:
        st["reported"] = 0
        st["finalised"] = 0

with open(os.path.join(out_dir, "station_stats.json"), "w", encoding="utf-8") as f:
    json.dump(list(station_stats.values()), f, ensure_ascii=False)

print("--- 7. Generate Master Summary KPIs ---")
total_reported_all = 68206
total_ui_count = len(ui_cases)
grave_ui = sum(1 for c in ui_cases if str(c["gravity"]).lower() == "grave")
non_grave_ui = total_ui_count - grave_ui
long_pending_count = len(long_pending_ui)
above_1yr_count = sum(1 for c in ui_cases if "above 1 year" in str(c["timeline"]).lower())
cc_awaited_count = sum(1 for c in ui_cases if "sc/prc" in str(c["reason_for_ui"]).lower() or "cc no" in str(c["reason_for_ui"]).lower())
want_of_clues_count = sum(1 for c in ui_cases if "clues" in str(c["reason_for_ui"]).lower())
arrest_pending_count = sum(1 for c in ui_cases if "arrest" in str(c["reason_for_ui"]).lower())

kpis = {
    "district": "Srikakulam",
    "state": "Andhra Pradesh",
    "total_reported": total_reported_all,
    "total_ui": total_ui_count,
    "actual_ui": 1855,
    "long_pending_ui": long_pending_count,
    "above_1yr_ui": above_1yr_count,
    "grave_ui": grave_ui,
    "non_grave_ui": non_grave_ui,
    "cc_prc_awaited": cc_awaited_count,
    "want_of_clues": want_of_clues_count,
    "for_arrest": arrest_pending_count,
    "total_stations": len(station_stats),
    "sub_divisions": ["Srikakulam Sub-Division", "Tekkali Sub-Division", "Kasibugga Sub-Division"],
    "meeting_period": "Up to Current Review",
    "app_title": "Srikakulam District Police - SP Crime Review Portal"
}

with open(os.path.join(out_dir, "kpis.json"), "w", encoding="utf-8") as f:
    json.dump(kpis, f, ensure_ascii=False)

print("All datasets successfully generated in web_app/data!")
