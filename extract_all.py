import os
import json
import datetime
import openpyxl

base_dir = r"c:\Users\seeka\Desktop\SKLM\Point-1 & 2 All Head-wise Grave & Non-Grave UI Cases-upto\Point-1 & 2 All Head-wise Grave & Non-Grave UI Cases-upto"
tc_dir = os.path.join(base_dir, "Total Cases")
out_dir = r"c:\Users\seeka\Desktop\SKLM\data"
os.makedirs(out_dir, exist_ok=True)

def format_cell(v, is_pct_col=False):
    if v is None:
        return ""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, float):
        if is_pct_col:
            if -10.0 <= v <= 10.0 and abs(v) > 0.00001:
                return f"{v * 100:+.1f}%"
        if v.is_integer():
            return int(v)
        return round(v, 2)
    s = str(v).strip()
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s

def extract_sheet_table_fast(ws, max_rows=None):
    # Peek at first 10 rows to detect header
    peek_rows = []
    row_iter = ws.iter_rows(values_only=True)
    
    for _ in range(8):
        try:
            r = next(row_iter)
            peek_rows.append(r)
        except StopIteration:
            break
            
    if not peek_rows:
        return {"headers": [], "rows": [], "total_rows": 0, "shown_rows": 0}
        
    header_idx = 0
    for idx, r in enumerate(peek_rows):
        non_empty = [c for c in r if c is not None and str(c).strip() != ""]
        if len(non_empty) >= 2:
            header_idx = idx
            break
            
    header_row = peek_rows[header_idx]
    
    # Clean headers
    headers = []
    seen = {}
    for i, h in enumerate(header_row):
        h_str = str(h).strip().replace('\n', ' ') if h is not None else ""
        if not h_str:
            h_str = f"Col_{i+1}"
        if h_str in seen:
            seen[h_str] += 1
            h_str = f"{h_str}_{seen[h_str]}"
        else:
            seen[h_str] = 1
        headers.append(h_str)
        
    pct_cols = {i for i, h in enumerate(headers) if "%" in h.lower() or "percent" in h.lower()}
    
    data_rows = []
    # Collect rows from peek after header_idx
    for r in peek_rows[header_idx + 1:]:
        if not any(c is not None and str(c).strip() != "" for c in r):
            continue
        cleaned = [format_cell(r[i] if i < len(r) else None, i in pct_cols) for i in range(len(headers))]
        data_rows.append(cleaned)
        
    total_data_count = len(data_rows)
    
    # Stream the rest of the rows
    for r in row_iter:
        total_data_count += 1
        if max_rows and len(data_rows) >= max_rows:
            continue
        if not any(c is not None and str(c).strip() != "" for c in r):
            continue
        cleaned = [format_cell(r[i] if i < len(r) else None, i in pct_cols) for i in range(len(headers))]
        data_rows.append(cleaned)
        
    return {
        "headers": headers,
        "rows": data_rows,
        "total_rows": total_data_count,
        "shown_rows": len(data_rows)
    }

def process_workbook_fast(file_path, sheet_max_rows_map=None, default_max=None):
    fname = os.path.basename(file_path)
    print(f"Loading {fname} in read_only mode...", flush=True)
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    sheets_data = {}
    sheet_max_rows_map = sheet_max_rows_map or {}
    
    for s in wb.sheetnames:
        ws = wb[s]
        max_r = sheet_max_rows_map.get(s, default_max)
        print(f"  [{fname}] Sheet: '{s}' (limit={max_r})...", flush=True)
        sheets_data[s] = extract_sheet_table_fast(ws, max_rows=max_r)
    wb.close()
    return sheets_data

# 1. Master Headwise
f_hw = os.path.join(base_dir, "1. Total UI Cases-Head Wise.xlsx")
hw_data = process_workbook_fast(f_hw, sheet_max_rows_map={
    "Total UI Cases": None,
    "DCRB": 1500,
    "1": None,
    "2": None
})
with open(os.path.join(out_dir, "master_headwise.json"), "w", encoding="utf-8") as f:
    json.dump(hw_data, f, ensure_ascii=False)
print("--> Saved master_headwise.json", flush=True)

# 2. Module 1: Total Reported Cases
f_m1 = os.path.join(tc_dir, "1. Total Reported Cases.xlsx")
m1_data = process_workbook_fast(f_m1, sheet_max_rows_map={
    "Total": 2000
})
with open(os.path.join(out_dir, "module_1_reported.json"), "w", encoding="utf-8") as f:
    json.dump(m1_data, f, ensure_ascii=False)
print("--> Saved module_1_reported.json", flush=True)

# 3. Module 1A: Total UI Cases
f_m1a = os.path.join(tc_dir, "1A. Total UI Cases.xlsx")
m1a_data = process_workbook_fast(f_m1a, sheet_max_rows_map={
    "Total": None,
    "Without Number": None
})
with open(os.path.join(out_dir, "module_1a_ui.json"), "w", encoding="utf-8") as f:
    json.dump(m1a_data, f, ensure_ascii=False)
print("--> Saved module_1a_ui.json", flush=True)

# 4. Module 1B: UI Cases Compliance
f_m1b = os.path.join(tc_dir, "1B. UI Cases Compliance.xlsx")
m1b_data = process_workbook_fast(f_m1b, sheet_max_rows_map={
    "Total": None,
    "Actual UI Cases": None,
    "Reasons": None
})
with open(os.path.join(out_dir, "module_1b_compliance.json"), "w", encoding="utf-8") as f:
    json.dump(m1b_data, f, ensure_ascii=False)
print("--> Saved module_1b_compliance.json", flush=True)

# 5. Module 2: Long Pending Reported Cases
f_m2 = os.path.join(tc_dir, "2. Long Pending Reported Cases.xlsx")
m2_data = process_workbook_fast(f_m2, sheet_max_rows_map={
    "Total": 2000
})
with open(os.path.join(out_dir, "module_2_long_reported.json"), "w", encoding="utf-8") as f:
    json.dump(m2_data, f, ensure_ascii=False)
print("--> Saved module_2_long_reported.json", flush=True)

# 6. Module 2A: Long Pending UI Cases
f_m2a = os.path.join(tc_dir, "2A. Long Pending UI Cases.xlsx")
m2a_data = process_workbook_fast(f_m2a, sheet_max_rows_map={
    "Total": None,
    "Without Number": None
})
with open(os.path.join(out_dir, "module_2a_long_ui.json"), "w", encoding="utf-8") as f:
    json.dump(m2a_data, f, ensure_ascii=False)
print("--> Saved module_2a_long_ui.json", flush=True)

# 7. Module 4: Head Wise Abstract
f_m4 = os.path.join(tc_dir, "4. Head Wise Abstract.xlsx")
m4_data = process_workbook_fast(f_m4, sheet_max_rows_map={
    "Total": 2000
})
with open(os.path.join(out_dir, "module_4_abstract.json"), "w", encoding="utf-8") as f:
    json.dump(m4_data, f, ensure_ascii=False)
print("--> Saved module_4_abstract.json", flush=True)

print("\nSUCCESS: All 7 files extracted cleanly!", flush=True)
