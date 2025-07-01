import pandas as pd
import os
import argparse
import glob
import shutil

# File paths
DATA_DIR = os.path.join(os.path.dirname(__file__), '../../data')
DIRECT_FILE = None
POS_FILE = None
XAAS_FILE = None
CREMEMO_FILE = None
MANREV_FILE = None
MBR_FILE = None
VSB_FILE = None
VSB_PIVOT_FILE = None
MBR_PIVOT_FILE = None

# --- Column Name Configuration ---
# List of possible column names for Sales Order and Bookings.
# The script will use the first name it finds in each file.
POSSIBLE_SO_COLS = ['Sales Order Number', 'SO Number', 'Web Order ID', 'SO']
POSSIBLE_BOOKINGS_COLS = ['Total Bookings', 'Bookings']
MBR_EXTRA_COLS = ['End Customer Company Name', 'L4', 'Product Family', 'Month ID']

def find_column_name(df_columns, possible_names):
    """Finds the first matching column name from a list of possibilities."""
    for name in possible_names:
        if name in df_columns:
            return name
    return None

# Step 0.5: Combine DIRECT, POS, and XAAS files into a new vsb01small.xlsx
def concat_VSB_files(file_map):
    """Combines VSB source files into a single temp file for comparison."""
    print("Step 0.5: Concatenating VSB source files...")
    dfs = []
    for key in ['DIRECT', 'POS', 'XAAS', 'MANREV', 'CREMEMO']:
        f = file_map.get(key)
        if not f:
            continue
        df = pd.read_excel(f)
        if key == 'MANREV':
            df = df[['SO Number', 'Revenue (Original)', 'Type']].copy()
            df.rename(columns={'SO Number': 'SO', 'Revenue (Original)': 'Bookings'}, inplace=True)
        elif key == 'CREMEMO':
            df = df[['SO Number', 'Bookings', 'Type']].copy()
            df['SO'] = df['SO Number'].fillna(-9999)
            df['SO'] = df['SO'].replace('', -9999)
            df.drop(columns=['SO Number'], inplace=True)
            df = df[['SO', 'Bookings', 'Type']]
        else:
            so_col = find_column_name(df.columns, POSSIBLE_SO_COLS)
            bookings_col = find_column_name(df.columns, POSSIBLE_BOOKINGS_COLS)
            df.rename(columns={so_col: 'SO', bookings_col: 'Bookings'}, inplace=True)
            if 'Type' not in df.columns:
                df['Type'] = key
            df = df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        dfs.append(df)
    combined_df = pd.concat(dfs, ignore_index=True)
    out_path = os.path.join(os.path.dirname(list(file_map.values())[0]), 'vsb-concat.xlsx')
    combined_df.to_excel(out_path, index=False)
    print(f"Concatenated data saved to {out_path}")
    return out_path

# Step 1: Pivot (group by SO, sum Bookings)
def create_pivot(input_file, output_file, extra_cols=None, skiprows=0):
    """Reads an Excel file, pivots it, and saves the pivot table."""
    df = pd.read_excel(input_file, skiprows=skiprows)
    
    # Dynamically find the correct column names
    so_col = find_column_name(df.columns, POSSIBLE_SO_COLS)
    bookings_col = find_column_name(df.columns, POSSIBLE_BOOKINGS_COLS)
    
    if not so_col or not bookings_col:
        print(f"Error: Could not find required SO/Bookings columns in {input_file}.")
        print(f"Available columns: {list(df.columns)}")
        raise ValueError(f"Could not find required columns in {input_file}")

    # --- Data Cleaning ---
    # Convert bookings column to a numeric type, removing currency symbols and commas
    # Errors='coerce' will turn any values that can't be converted into NaN (Not a Number)
    df[bookings_col] = pd.to_numeric(
        df[bookings_col].astype(str).str.replace(r'[$,]', '', regex=True),
        errors='coerce'
    )
    # Optional: Fill non-numeric rows with 0, or you could drop them
    df.fillna({bookings_col: 0}, inplace=True)

    agg_spec = {bookings_col: 'sum'}
    if 'Type' in df.columns:
        agg_spec['Type'] = 'first'
    
    if extra_cols:
        for col in extra_cols:
            if col in df.columns:
                agg_spec[col] = 'first'

    pivot = df.groupby(so_col, as_index=False).agg(agg_spec)
    pivot.to_excel(output_file, index=False)
    # Return the pivot and the column names used
    return pivot, so_col, bookings_col

# Step 2: Compare SOs with bookings > $25k
def compare_pivots(vsb, vsb_so_col, vsb_bookings_col, mbr, mbr_so_col, mbr_bookings_col, threshold=25000, extra_cols=None):
    """Compares pivot tables with MBR as SSoT (Single Source of Truth).
    
    MBR data is the primary source - all SOs with bookings above threshold from MBR are included.
    VSB data is checked against MBR to see if it's included in the MBR dataset.
    """
    # Filter MBR SOs above threshold (MBR is SSoT)
    mbr_high = mbr[mbr[mbr_bookings_col] > threshold]
    
    # Set SO as index for fast lookup in VSB pivot
    vsb_dict = vsb.set_index(vsb_so_col)[vsb_bookings_col].to_dict()

    if extra_cols is None:
        extra_cols = []

    results = []
    for _, row in mbr_high.iterrows():
        so = row[mbr_so_col]
        mbr_amt = row[mbr_bookings_col]
        
        vsb_amt = vsb_dict.get(so)
        
        extra_data = tuple(row.get(col) for col in extra_cols)

        if vsb_amt is None:
            results.append((so, None, mbr_amt, 'Missing in VSB') + extra_data)
        elif abs(vsb_amt - mbr_amt) > 1e-2:  # Allowing for floating point tolerance
            results.append((so, vsb_amt, mbr_amt, 'Amount mismatch') + extra_data)
        else:
            results.append((so, vsb_amt, mbr_amt, 'Match') + extra_data)
    
    return results

def analyseBookingsGap(results_df):
    """
    Calculates the sum and count of missing deals from the comparison results.
    A deal is considered missing if 'isMatch' is 'no' AND 'Vsb$' is 'N/A'
    which corresponds to Vsb_Amount being NaN.
    """
    missing_deals_df = results_df[results_df['Vsb_Amount'].isna()]
    SumMissingComp = missing_deals_df['MBR_Amount'].sum()
    CountMissingDeals = len(missing_deals_df)
    return SumMissingComp, CountMissingDeals

def detectFileType(data_dir):
    """
    Detects file type for all Excel files in the directory. Returns a list of dicts: {filename, type}.
    Types: DIRECT, POS, XAAS, MANREV, CREMEMO, MBR
    For MBR: if no Type column, check first row, if matches MBR, set type to MBR.
    """
    canonical_types = ['DIRECT', 'POS', 'XAAS', 'MANREV', 'CREMEMO', 'MBR']
    excel_files = glob.glob(os.path.join(data_dir, '*.xlsx'))
    detected = []
    for f in excel_files:
        try:
            df = pd.read_excel(f, nrows=2)
            if 'Type' in df.columns:
                type_val = str(df['Type'].iloc[0]).strip().lower() if len(df) > 0 else ''
                if 'direct' in type_val:
                    detected.append({'filename': f, 'type': 'DIRECT'})
                elif 'pos' in type_val:
                    detected.append({'filename': f, 'type': 'POS'})
                elif 'xaas' in type_val:
                    detected.append({'filename': f, 'type': 'XAAS'})
                elif 'manual' in type_val:
                    detected.append({'filename': f, 'type': 'MANREV'})
                elif 'credit' in type_val or 'memo' in type_val:
                    detected.append({'filename': f, 'type': 'CREMEMO'})
                else:
                    # fallback: check filename
                    fname = os.path.basename(f).lower()
                    for t in canonical_types:
                        if t.lower() in fname:
                            detected.append({'filename': f, 'type': t})
                            break
            else:
                # MBR detection: check first cell
                check_df = pd.read_excel(f, header=None, nrows=1, usecols=[0])
                cell_content = str(check_df.iloc[0, 0])
                if 'SS Bookings 360' in cell_content or 'Sales Order Number' in cell_content:
                    detected.append({'filename': f, 'type': 'MBR'})
        except Exception as e:
            print(f"Could not detect type for {f}: {e}")
    return detected

def normalizeFileContent(filepath, criteria=None):
    """
    Removes rows from the Excel file where the first column matches any string in criteria (case-insensitive, strip),
    or is empty. Returns the path to the cleaned file.
    """
    if criteria is None:
        criteria = []
    df = pd.read_excel(filepath, header=None)
    # Remove rows where first column is empty or matches any criteria
    def should_remove(val):
        if pd.isna(val) or str(val).strip() == '':
            return True
        val_str = str(val).strip().lower()
        for c in criteria:
            if c.lower() in val_str:
                return True
        return False
    mask = df[0].apply(should_remove)
    cleaned_df = df[~mask].copy()
    # Save to a new file
    cleaned_path = filepath.replace('.xlsx', '_normalized.xlsx')
    cleaned_df.to_excel(cleaned_path, index=False, header=False)
    return cleaned_path

def compare_MBR_VSB(filepaths):
    """
    Main entry: detects files, concatenates VSB, pivots, compares, outputs CSV.
    Accepts a list of file paths.
    """
    detected = []
    for f in filepaths:
        try:
            df = pd.read_excel(f, nrows=2)
            if 'Type' in df.columns:
                type_val = str(df['Type'].iloc[0]).strip().lower() if len(df) > 0 else ''
                if 'direct' in type_val:
                    detected.append({'filename': f, 'type': 'DIRECT'})
                elif 'pos' in type_val:
                    detected.append({'filename': f, 'type': 'POS'})
                elif 'xaas' in type_val:
                    detected.append({'filename': f, 'type': 'XAAS'})
                elif 'manual revenue' in type_val:
                    detected.append({'filename': f, 'type': 'MANREV'})
                elif 'credit/debit memo' in type_val:
                    detected.append({'filename': f, 'type': 'CREMEMO'})
            else:
                check_df = pd.read_excel(f, header=None, nrows=1, usecols=[0])
                cell_content = str(check_df.iloc[0, 0])
                if 'SS Bookings 360' in cell_content or 'Sales Order Number' in cell_content:
                    detected.append({'filename': f, 'type': 'MBR'})
        except Exception as e:
            print(f"Could not detect type for {f}: {e}")
    file_map = {d['type']: d['filename'] for d in detected if 'type' in d}
    if not any(k in file_map for k in ['DIRECT', 'POS', 'XAAS', 'MANREV', 'CREMEMO']):
        print("No VSB files to process.")
        return None
    vsb_file = concat_VSB_files(file_map)
    vsb_pivot_file = os.path.join(os.path.dirname(vsb_file), 'vsb-pivot.xlsx')
    mbr_file = file_map.get('MBR')
    mbr_pivot_file = os.path.join(os.path.dirname(vsb_file), 'mbr-pivot.xlsx')
    output_csv_path = os.path.join(os.path.dirname(vsb_file), 'output.csv')
    vsb_pivot, vsb_so_col, vsb_bookings_col = create_pivot(vsb_file, vsb_pivot_file)
    if mbr_file:
        # Normalize MBR file before pivoting
        normalized_mbr_file = normalizeFileContent(mbr_file, criteria=["grand total", "SS Bookings 360"])
        mbr_pivot, mbr_so_col, mbr_bookings_col = create_pivot(normalized_mbr_file, mbr_pivot_file, extra_cols=MBR_EXTRA_COLS, skiprows=0)
    else:
        print("No MBR file provided, skipping comparison.")
        return None
    comparison = compare_pivots(
        vsb_pivot, vsb_so_col, vsb_bookings_col,
        mbr_pivot, mbr_so_col, mbr_bookings_col,
        extra_cols=MBR_EXTRA_COLS
    )
    results_df_cols = ['SO#', 'Vsb_Amount', 'MBR_Amount', 'Original_Status'] + MBR_EXTRA_COLS
    results_df = pd.DataFrame(comparison, columns=results_df_cols)
    SumMissingComp, CountMissingDeals = analyseBookingsGap(results_df)
    results_df['Delta'] = results_df['MBR_Amount'] - results_df['Vsb_Amount']
    results_df['isMatch'] = results_df['Delta'].abs().lt(1000).apply(lambda x: 'yes' if x else 'no')
    if 'Type' in vsb_pivot.columns:
        type_map = vsb_pivot.set_index(vsb_so_col)['Type'].to_dict()
        results_df['Type'] = results_df['SO#'].map(type_map)
    else:
        results_df['Type'] = ''
    results_df.sort_values(by='MBR_Amount', ascending=False, inplace=True, na_position='last')
    results_df['Vsb$'] = results_df['Vsb_Amount'].apply(lambda x: f"${x:,.2f}" if pd.notna(x) else 'N/A')
    results_df['MBR$'] = results_df['MBR_Amount'].apply(lambda x: f"${x:,.2f}" if pd.notna(x) else 'N/A')
    results_df['Delta$'] = results_df['Delta'].apply(lambda x: f"${x:,.2f}" if pd.notna(x) else 'N/A')
    results_df['SO#'] = results_df['SO#'].apply(lambda x: str(int(float(x))) if pd.notna(x) and str(x).replace('.','',1).isdigit() else str(x))
    output_cols = ['SO#', 'MBR$', 'Vsb$', 'Delta$', 'isMatch', 'Type'] + MBR_EXTRA_COLS
    output_df = results_df[output_cols]
    output_df.to_csv(output_csv_path, index=False)
    for f in [vsb_file, vsb_pivot_file, mbr_pivot_file]:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass
    return {
        'output_file': output_csv_path,
        'sum_missing': float(SumMissingComp),
        'count_missing': int(CountMissingDeals)
    }

if __name__ == "__main__":
    import argparse
    def get_excel_files_from_dir(data_dir):
        """Return a list of .xlsx file paths in the given directory."""
        return glob.glob(os.path.join(data_dir, '*.xlsx'))
    parser = argparse.ArgumentParser(description="Compare VSB and MBR Excel files.")
    parser.add_argument('--data-dir', help='Path to a directory containing data files for local testing.')
    args = parser.parse_args()
    if args.data_dir:
        file_list = get_excel_files_from_dir(args.data_dir)
    else:
        file_list = get_excel_files_from_dir(DATA_DIR)
    try:
        compare_MBR_VSB(file_list)
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}")
