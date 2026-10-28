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
            # Check if value is a decimal percentage e.g. 0.15 or -0.25
            if -10.0 <= v <= 10.0 and abs(v) > 0.0001:
                return f"{v * 100:+.1f}%"
        # Round regular floats if they have many decimal digits
        if v.is_integer():
            return int(v)
        return round(v, 2)
    s = str(v).strip()
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s

def extract_sheet_table(ws, max_rows=None):
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"headers": [], "rows": [], "total_rows": 0}
    
    # Find the header row (first row with at least 2 non-empty values)
    header_idx = 0
    for idx, r in enumerate(rows[:6]):
        non_empty = [c for c in r if c is not None and str(c).strip() != ""]
        if len(non_empty) >= 2:
            header_idx = idx
            break
            
    header_row = rows[header_idx]
    
    # Process headers
    headers = []
    seen = {}
    for i, h in enumerate(header_row):
        h_str = str(h).strip().replace('\n', ' ') if h is not None else f"Column_{i+1}"
        if not h_str:
            h_str = f"Column_{i+1}"
        if h_str in seen:
            seen[h_str] += 1
            h_str = f"{h_str}_{seen[h_str]}"
        else:
            seen[h_str] = 1
        headers.append(h_str)
        
    pct_cols = {i for i, h in enumerate(headers) if "%" in h.lower() or "percent" in h.lower()}
    
    data_rows = []
    data_slice = rows[header_idx + 1:]
    total_data_count = len(data_slice)
    
    if max_rows and total_data_count > max_rows:
        data_slice = data_slice[:max_rows]
        
    for r in data_slice:
        # Check if row is not completely empty
        if not any(c is not None and str(c).strip() != "" for c in r):
            continue
        cleaned_row = []
        for i in range(len(headers)):
            val = r[i] if i < len(r) else None
            is_pct = i in pct_cols
            cleaned_row.append(format_cell(val, is_pct))
        data_rows.append(cleaned_row)
        
    return {
        "headers": headers,
        "rows": data_rows,
        "total_rows": total_data_count,
        "shown_rows": len(data_rows)
    }

print("Extractor helper defined.")
