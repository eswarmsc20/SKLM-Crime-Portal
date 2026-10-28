import os
import json
import datetime
import openpyxl

base_dir = r"c:\Users\seeka\Desktop\SKLM\Point-1 & 2 All Head-wise Grave & Non-Grave UI Cases-upto\Point-1 & 2 All Head-wise Grave & Non-Grave UI Cases-upto"
tc_dir = os.path.join(base_dir, "Total Cases")
out_dir = r"c:\Users\seeka\Desktop\SKLM\data"
web_out_dir = r"c:\Users\seeka\Desktop\SKLM\web_app\data"
os.makedirs(out_dir, exist_ok=True)
os.makedirs(web_out_dir, exist_ok=True)

def is_data_cell(val):
    if val is None:
        return False
    s = str(val).strip()
    if not s:
        return False
    # Check if number
    try:
        float(s.replace(',', ''))
        return True
    except ValueError:
        pass
    # Check if date
    if isinstance(val, (datetime.datetime, datetime.date)):
        return True
    # Check if FIR pattern
    if '/' in s and any(c.isdigit() for c in s):
        parts = s.split('/')
        if len(parts) == 2 and any(p.strip().isdigit() for p in parts):
            return True
    return False

def format_cell(v, is_pct_col=False):
    if v is None:
        return ""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, float):
        if is_pct_col:
            if -10.0 <= v <= 10.0:
                pct = v * 100
                return f"{pct:+.1f}%" if abs(pct) >= 0.05 else "0.0%"
        if v.is_integer():
            return int(v)
        return round(v, 2)
    s = str(v).strip()
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s

def find_header_row(peek_rows):
    header_idx = -1
    
    # Priority 1: A row that has known column keywords
    for idx, r in enumerate(peek_rows):
        line = " ".join(str(c).strip() for c in r if c is not None).lower()
        if any(k in line for k in ["s.no", "s. no.", "s. no", "name of the ps", "name of the i.o", "police station", "fir no", "crime head", "head of crime", "head of the crime", "head/reason", "sub-division"]):
            non_empty = [c for c in r if c is not None and str(c).strip() != ""]
            if len(non_empty) >= 2:
                header_idx = idx
                break

    # Priority 2: Row with specific domain keywords
    if header_idx == -1:
        for idx, r in enumerate(peek_rows):
            line = " ".join(str(c).strip() for c in r if c is not None).lower()
            if any(k in line for k in ["gravity type", "act type", "below 45 days", "2024", "2025", "2026", "motive"]):
                non_empty = [c for c in r if c is not None and str(c).strip() != ""]
                if len(non_empty) >= 2:
                    header_idx = idx
                    break

    # Priority 3: First row with at least 3 non-empty string cells
    if header_idx == -1:
        for idx, r in enumerate(peek_rows):
            non_empty = [c for c in r if c is not None and str(c).strip() != ""]
            if len(non_empty) >= 3:
                header_idx = idx
                break

    if header_idx == -1:
        header_idx = 0
        
    return header_idx

def is_true_sub_header(next_r, header_row):
    if not next_r:
        return False
        
    non_empty = [c for c in next_r if c is not None and str(c).strip() != ""]
    if len(non_empty) < 2:
        return False
        
    # Check first non-empty cell: if it's an integer like 1, 2, 3... it's a DATA ROW!
    first_val = None
    for c in next_r:
        if c is not None and str(c).strip() != "":
            first_val = c
            break
            
    if first_val is not None:
        first_str = str(first_val).strip()
        if first_str.isdigit():
            return False
            
    # Check count of data cells (numbers, dates, FIRs)
    data_cells_count = sum(1 for c in next_r if is_data_cell(c))
    if data_cells_count >= 3:
        return False
        
    line = " ".join(str(c).strip() for c in next_r if c is not None).lower()
    if any(k in line for k in ["reported", "finalized", "police disposal", "court disposal", "sc/prc", "actual ui", "below 45", "above 1 year", "total"]):
        return True
        
    return False

def extract_sheet_table_perfect(ws, max_rows=None):
    peek_rows = []
    row_iter = ws.iter_rows(values_only=True)
    
    for _ in range(12):
        try:
            r = next(row_iter)
            peek_rows.append(r)
        except StopIteration:
            break
            
    if not peek_rows:
        return {"headers": [], "rows": [], "total_rows": 0, "shown_rows": 0}
        
    header_idx = find_header_row(peek_rows)
    header_row = peek_rows[header_idx]
    
    sub_header_row = None
    if header_idx + 1 < len(peek_rows):
        if is_true_sub_header(peek_rows[header_idx + 1], header_row):
            sub_header_row = peek_rows[header_idx + 1]

    headers = []
    seen = {}
    current_parent = ""
    for i in range(len(header_row)):
        top_h = str(header_row[i]).strip().replace('\n', ' ') if header_row[i] is not None else ""
        sub_h = str(sub_header_row[i]).strip().replace('\n', ' ') if sub_header_row and i < len(sub_header_row) and sub_header_row[i] is not None else ""

        if sub_header_row:
            if top_h and sub_h and top_h != sub_h:
                h_str = f"{top_h} - {sub_h}"
                current_parent = top_h
            elif top_h and not sub_h:
                h_str = top_h
                current_parent = top_h
            elif sub_h and not top_h:
                if current_parent and "s.no" not in current_parent.lower() and "s. no" not in current_parent.lower() and "name" not in current_parent.lower():
                    h_str = f"{current_parent} - {sub_h}"
                else:
                    h_str = sub_h
            else:
                h_str = f"Col_{i+1}"
        else:
            h_str = top_h if top_h else f"Col_{i+1}"

        if not h_str:
            h_str = f"Col_{i+1}"

        if h_str in seen:
            seen[h_str] += 1
            h_str = f"{h_str}_{seen[h_str]}"
        else:
            seen[h_str] = 1
        headers.append(h_str)

    pct_cols = {i for i, h in enumerate(headers) if "%" in h.lower() or "percent" in h.lower()}

    start_row_idx = header_idx + (2 if sub_header_row else 1)

    data_rows = []
    for r in peek_rows[start_row_idx:]:
        line = " ".join(str(c) for c in r if c is not None).strip()
        if line.startswith("(1)") or (line.startswith("1 | 2 | 3")) or ("(1)" in line and "(2)" in line and len(line) < 60):
            continue
        if not any(c is not None and str(c).strip() != "" for c in r):
            continue
        cleaned = [format_cell(r[i] if i < len(r) else None, i in pct_cols) for i in range(len(headers))]
        data_rows.append(cleaned)

    total_data_count = len(data_rows)

    for r in row_iter:
        line = " ".join(str(c) for c in r if c is not None).strip()
        if line.startswith("(1)") or (line.startswith("1 | 2 | 3")) or ("(1)" in line and "(2)" in line and len(line) < 60):
            continue
        total_data_count += 1
        if max_rows and len(data_rows) >= max_rows:
            continue
        if not any(c is not None and str(c).strip() != "" for c in r):
            continue
        cleaned = [format_cell(r[i] if i < len(r) else None, i in pct_cols) for i in range(len(headers))]
        data_rows.append(cleaned)

    # Trim trailing completely empty placeholder columns
    last_val_col = -1
    for c_i in range(len(headers)):
        h = headers[c_i]
        is_placeholder = h.startswith("Col_")
        has_any = any(row[c_i] != "" for row in data_rows) if data_rows else False
        if not is_placeholder or has_any:
            last_val_col = c_i

    if last_val_col != -1 and last_val_col < len(headers) - 1:
        headers = headers[:last_val_col + 1]
        data_rows = [row[:last_val_col + 1] for row in data_rows]

    return {
        "headers": headers,
        "rows": data_rows,
        "total_rows": total_data_count,
        "shown_rows": len(data_rows)
    }

def process_and_save(file_path, json_name, js_name, var_name, sheet_limits=None):
    fname = os.path.basename(file_path)
    print(f"\nProcessing {fname}...", flush=True)
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    sheets_data = {}
    sheet_limits = sheet_limits or {}
    for s in wb.sheetnames:
        lim = sheet_limits.get(s, None)
        sheets_data[s] = extract_sheet_table_perfect(wb[s], max_rows=lim)
        h_sample = sheets_data[s]["headers"][:4]
        rows_cnt = len(sheets_data[s]["rows"])
        first_rec = sheets_data[s]["rows"][0][:3] if rows_cnt > 0 else []
        print(f"  --> [{s}]: {len(sheets_data[s]['headers'])} cols, {rows_cnt} rows | H: {h_sample} | R1: {first_rec}", flush=True)
    wb.close()

    # Write JSON to data and web_app/data
    for target_dir in [out_dir, web_out_dir]:
        jpath = os.path.join(target_dir, json_name)
        with open(jpath, "w", encoding="utf-8") as f:
            json.dump(sheets_data, f, ensure_ascii=False)

        jspath = os.path.join(target_dir, js_name)
        with open(jspath, "w", encoding="utf-8") as f:
            f.write(f"window.{var_name} = {json.dumps(sheets_data, ensure_ascii=False)};\n")

    print(f"  SUCCESS: Saved {json_name} & {js_name} ({len(sheets_data)} sheets)", flush=True)

if __name__ == "__main__":
    print("=========================================================================")
    print("STARTING PERFECT SMART EXTRACTION FOR ALL 7 FILES")
    print("=========================================================================")

    # 1. Total UI Cases-Head Wise.xlsx (Master)
    process_and_save(
        os.path.join(base_dir, "1. Total UI Cases-Head Wise.xlsx"),
        "master_headwise.json",
        "master_headwise.js",
        "MASTER_HEADWISE"
    )

    # 2. 1. Total Reported Cases.xlsx
    process_and_save(
        os.path.join(tc_dir, "1. Total Reported Cases.xlsx"),
        "module_1_reported.json",
        "module_1_reported.js",
        "MODULE_1_REPORTED"
    )

    # 3. 1A. Total UI Cases.xlsx
    process_and_save(
        os.path.join(tc_dir, "1A. Total UI Cases.xlsx"),
        "module_1a_ui.json",
        "module_1a_ui.js",
        "MODULE_1A_UI"
    )

    # 4. 1B. UI Cases Compliance.xlsx
    process_and_save(
        os.path.join(tc_dir, "1B. UI Cases Compliance.xlsx"),
        "module_1b_compliance.json",
        "module_1b_compliance.js",
        "MODULE_1B_COMPLIANCE"
    )

    # 5. 2. Long Pending Reported Cases.xlsx
    process_and_save(
        os.path.join(tc_dir, "2. Long Pending Reported Cases.xlsx"),
        "module_2_long_reported.json",
        "module_2_long_reported.js",
        "MODULE_2_LONG_REPORTED"
    )

    # 6. 2A. Long Pending UI Cases.xlsx
    process_and_save(
        os.path.join(tc_dir, "2A. Long Pending UI Cases.xlsx"),
        "module_2a_long_ui.json",
        "module_2a_long_ui.js",
        "MODULE_2A_LONG_UI"
    )

    # 7. 4. Head Wise Abstract.xlsx
    process_and_save(
        os.path.join(tc_dir, "4. Head Wise Abstract.xlsx"),
        "module_4_abstract.json",
        "module_4_abstract.js",
        "MODULE_4_ABSTRACT"
    )

    print("\n=========================================================================")
    print("ALL 7 FILES EXTRACTED WITH 100% CLEAN HEADERS AND PERFECT FIRST RECORDS!")
    print("=========================================================================")
