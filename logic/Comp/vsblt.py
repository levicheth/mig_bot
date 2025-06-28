import pandas as pd
import os
import argparse
import glob
import shutil

# File paths
DATA_DIR = os.path.join(os.path.dirname(__file__), '../../data')
DIRECT_FILE = os.path.join(DATA_DIR, 'Goal to Cash Transactions - DIRECT.xlsx')
POS_FILE = os.path.join(DATA_DIR, 'Goal to Cash Transactions - POS.xlsx')
XAAS_FILE = os.path.join(DATA_DIR, 'Goal to Cash Transactions XAAS.xlsx')
VSB_FILE = os.path.join(DATA_DIR, 'vsb01small.xlsx')
MBR_FILE = os.path.join(DATA_DIR, 'MBR.xlsx')
VSB_PIVOT_FILE = os.path.join(DATA_DIR, 'vsb01pivot.xlsx')
MBR_PIVOT_FILE = os.path.join(DATA_DIR, 'mbr01pivot.xlsx')
CREMEMO_FILE = os.path.join(DATA_DIR, 'Goal to Cash Transactions CREMEMO.xlsx')
MANREV_FILE = os.path.join(DATA_DIR, 'Goal to Cash Transactions MAN REV.xlsx')

# --- Column Name Configuration ---
# List of possible column names for Sales Order and Bookings.
# The script will use the first name it finds in each file.
POSSIBLE_SO_COLS = ['Sales Order Number', 'SO Number', 'Web Order ID', 'SO']
POSSIBLE_BOOKINGS_COLS = ['Total Bookings', 'Bookings']

def find_column_name(df_columns, possible_names):
    """Finds the first matching column name from a list of possibilities."""
    for name in possible_names:
        if name in df_columns:
            return name
    return None

# Step 0.5: Combine DIRECT, POS, and XAAS files into a new vsb01small.xlsx
def combine_source_files():
    """Combines DIRECT, POS, XAAS, MANUAL REVENUE, and CREDIT MEMO source files into a single temp file for comparison."""
    print("Step 0.5: Combining source files...")
    # For each file, keep 'Type' as well
    direct_df = pd.read_excel(DIRECT_FILE)
    pos_df = pd.read_excel(POS_FILE)
    xaas_df = pd.read_excel(XAAS_FILE)
    manrev_df = pd.read_excel(MANREV_FILE)
    crememo_df = pd.read_excel(CREMEMO_FILE)

    # Find column names dynamically for each file
    direct_so_col = find_column_name(direct_df.columns, POSSIBLE_SO_COLS)
    direct_bookings_col = find_column_name(direct_df.columns, POSSIBLE_BOOKINGS_COLS)
    pos_so_col = find_column_name(pos_df.columns, POSSIBLE_SO_COLS)
    pos_bookings_col = find_column_name(pos_df.columns, POSSIBLE_BOOKINGS_COLS)
    xaas_so_col = find_column_name(xaas_df.columns, POSSIBLE_SO_COLS)
    xaas_bookings_col = find_column_name(xaas_df.columns, POSSIBLE_BOOKINGS_COLS)

    # For MANUAL REVENUE file, use only 'SO Number', 'Revenue (Original)', and 'Type'
    manrev_df = manrev_df[['SO Number', 'Revenue (Original)', 'Type']].copy()
    manrev_df.rename(columns={'SO Number': 'SO', 'Revenue (Original)': 'Bookings'}, inplace=True)

    # For CREDIT MEMO file, use 'SO Number' (replace NA/empty with -9999), 'Bookings', and 'Type'
    crememo_df = crememo_df[['SO Number', 'Bookings', 'Type']].copy()
    crememo_df['SO'] = crememo_df['SO Number'].fillna(-9999)
    crememo_df['SO'] = crememo_df['SO'].replace('', -9999)
    crememo_df.drop(columns=['SO Number'], inplace=True)
    crememo_df = crememo_df[['SO', 'Bookings', 'Type']]

    # Standardize column names before combining
    direct_df.rename(columns={direct_so_col: 'SO', direct_bookings_col: 'Bookings'}, inplace=True)
    pos_df.rename(columns={pos_so_col: 'SO', pos_bookings_col: 'Bookings'}, inplace=True)
    xaas_df.rename(columns={xaas_so_col: 'SO', xaas_bookings_col: 'Bookings'}, inplace=True)
    direct_df = direct_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
    pos_df = pos_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
    xaas_df = xaas_df.loc[:, ['SO', 'Bookings', 'Type']].copy()

    # Combine all dataframes
    combined_df = pd.concat([
        direct_df,
        pos_df,
        xaas_df,
        manrev_df,
        crememo_df
    ], ignore_index=True)

    # Save the combined data to be used by the next steps
    combined_df.to_excel(VSB_FILE, index=False)
    print(f"Combined data saved to {VSB_FILE}")

# Step 1: Pivot (group by SO, sum Bookings)
def create_pivot(input_file, output_file):
    """Reads an Excel file, pivots it, and saves the pivot table."""
    df = pd.read_excel(input_file)
    
    # Dynamically find the correct column names
    so_col = find_column_name(df.columns, POSSIBLE_SO_COLS)
    bookings_col = find_column_name(df.columns, POSSIBLE_BOOKINGS_COLS)
    
    if not so_col or not bookings_col:
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

    # For Type, take the first non-null value per SO
    if 'Type' in df.columns:
        pivot = df.groupby(so_col, as_index=False).agg({
            bookings_col: 'sum',
            'Type': lambda x: x.dropna().iloc[0] if not x.dropna().empty else ''
        })
    else:
        pivot = df.groupby(so_col, as_index=False)[bookings_col].sum()
    pivot.to_excel(output_file, index=False)
    # Return the pivot and the column names used
    return pivot, so_col, bookings_col

# Step 2: Compare SOs with bookings > $25k
def compare_pivots(vsb, vsb_so_col, vsb_bookings_col, mbr, mbr_so_col, mbr_bookings_col, threshold=25000):
    """Compares pivot tables with MBR as SSoT (Single Source of Truth).
    
    MBR data is the primary source - all SOs with bookings above threshold from MBR are included.
    VSB data is checked against MBR to see if it's included in the MBR dataset.
    """
    # Filter MBR SOs above threshold (MBR is SSoT)
    mbr_high = mbr[mbr[mbr_bookings_col] > threshold]
    
    # Set SO as index for fast lookup in VSB pivot
    vsb_dict = vsb.set_index(vsb_so_col)[vsb_bookings_col].to_dict()

    results = []
    for _, row in mbr_high.iterrows():
        so = row[mbr_so_col]
        mbr_amt = row[mbr_bookings_col]
        
        vsb_amt = vsb_dict.get(so)
        
        if vsb_amt is None:
            results.append((so, None, mbr_amt, 'Missing in VSB'))
        elif abs(vsb_amt - mbr_amt) > 1e-2:  # Allowing for floating point tolerance
            results.append((so, vsb_amt, mbr_amt, 'Amount mismatch'))
        else:
            results.append((so, vsb_amt, mbr_amt, 'Match'))
    
    return results

def detectFilename(data_dir=None):
    """
    Scans the data folder for Excel files, detects their type by filename or by reading the 'Type' column and its value in the second row,
    and renames them to the canonical file paths used in the script. Returns a dict of role->path for all found files.
    """
    if data_dir is None:
        data_dir = DATA_DIR

    canonical_names = {
        'DIRECT': 'Goal to Cash Transactions - DIRECT.xlsx',
        'POS': 'Goal to Cash Transactions - POS.xlsx',
        'XAAS': 'Goal to Cash Transactions XAAS.xlsx',
        'MANREV': 'Goal to Cash Transactions MAN REV.xlsx',
        'CREMEMO': 'Goal to Cash Transactions CREMEMO.xlsx',
        'MBR': 'MBR.xlsx'
    }

    def detect_type_from_content(filepath):
        try:
            df = pd.read_excel(filepath, nrows=2)
            if 'Type' not in df.columns:
                return None
            type_val = str(df['Type'].iloc[0]).strip().lower() if len(df) > 0 else ''
            if 'direct' in type_val:
                return 'DIRECT'
            if 'pos' in type_val:
                return 'POS'
            if 'xaas' in type_val:
                return 'XAAS'
            if 'manual' in type_val:
                return 'MANREV'
            if 'credit' in type_val or 'memo' in type_val:
                return 'CREMEMO'
            return None
        except Exception:
            return None

    excel_files = glob.glob(os.path.join(data_dir, '*.xlsx'))
    role_to_path = {}
    for f in excel_files:
        fname = os.path.basename(f).lower()
        if 'mbr' in fname:
            role = 'MBR'
        else:
            role = detect_type_from_content(f)
        if role and role not in role_to_path:
            canonical_path = os.path.join(data_dir, canonical_names[role])
            if os.path.abspath(f) != os.path.abspath(canonical_path):
                shutil.move(f, canonical_path)
            role_to_path[role] = canonical_path
    return role_to_path

def main():
    """Main function to execute the pivot and comparison logic."""
    # --- Step 0: Detect and rename files dynamically ---
    role_to_path = detectFilename()
    if not role_to_path:
        print("No recognized Excel files found in data folder.")
        return
    # Only use files that are present
    direct_file = role_to_path.get('DIRECT')
    pos_file = role_to_path.get('POS')
    xaas_file = role_to_path.get('XAAS')
    manrev_file = role_to_path.get('MANREV')
    crememo_file = role_to_path.get('CREMEMO')
    mbr_file = role_to_path.get('MBR')
    input_files = [direct_file, pos_file, xaas_file, manrev_file, crememo_file, mbr_file]
    # Remove None values
    input_files = [f for f in input_files if f]
    if not input_files:
        print("No valid input files to process.")
        return
    compare_MBR_VSB(input_files)
    print("\nComparison complete. Results saved to data/output.csv")
    output_csv_path = os.path.join(DATA_DIR, 'output.csv')
    if os.path.exists(output_csv_path):
        output_df = pd.read_csv(output_csv_path)
        print("\n--- Preview of output.csv ---")
        print(output_df.to_string(index=False))
    else:
        print("No output.csv generated.")

def compare_MBR_VSB(input_files=None):
    """
    Accepts a list of Excel file paths (input_files) in the order:
    [DIRECT, POS, XAAS, MANREV, CREMEMO, MBR] (any subset, order doesn't matter)
    If input_files is None, auto-detects files in the data folder.
    Runs the same logic as main(), but only uses the provided files.
    Returns the path to the generated output.csv.
    """
    if input_files is None:
        role_to_path = detectFilename()
        input_files = [role_to_path.get(role) for role in ['DIRECT', 'POS', 'XAAS', 'MANREV', 'CREMEMO', 'MBR']]
        input_files = [f for f in input_files if f]
    
    # Map roles to files for flexible logic - use detectFilename logic for content-based detection
    role_map = {}
    print("start to detect file type")
    for f in input_files:
        try:
            df = pd.read_excel(f, nrows=2)
            if 'Type' in df.columns:
                type_val = str(df['Type'].iloc[0]).strip().lower() if len(df) > 0 else ''
                if 'direct' in type_val:
                    role_map['DIRECT'] = f
                elif 'pos' in type_val:
                    role_map['POS'] = f
                elif 'xaas' in type_val:
                    role_map['XAAS'] = f
                elif 'manual' in type_val:
                    role_map['MANREV'] = f
                elif 'credit' in type_val or 'memo' in type_val:
                    role_map['CREMEMO'] = f
            # Check for MBR files by looking for "Bookings Type" column
            if 'Bookings Type' in df.columns:
                role_map['MBR'] = f
            # Also check filename for MBR files as fallback
            fname = os.path.basename(f).lower()
            if 'mbr' in fname:
                role_map['MBR'] = f
        except Exception as e:
            print(f"Error reading file {f}: {e}")
            continue
    # Prepare dataframes for those files that are present
    dfs = {}
    if role_map.get('DIRECT'):
        direct_df = pd.read_excel(role_map['DIRECT'])
        direct_so_col = find_column_name(direct_df.columns, POSSIBLE_SO_COLS)
        direct_bookings_col = find_column_name(direct_df.columns, POSSIBLE_BOOKINGS_COLS)
        direct_df.rename(columns={direct_so_col: 'SO', direct_bookings_col: 'Bookings'}, inplace=True)
        if 'Type' in direct_df.columns:
            direct_df = direct_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        else:
            direct_df['Type'] = 'Direct'
            direct_df = direct_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        dfs['DIRECT'] = direct_df
    if role_map.get('POS'):
        pos_df = pd.read_excel(role_map['POS'])
        pos_so_col = find_column_name(pos_df.columns, POSSIBLE_SO_COLS)
        pos_bookings_col = find_column_name(pos_df.columns, POSSIBLE_BOOKINGS_COLS)
        pos_df.rename(columns={pos_so_col: 'SO', pos_bookings_col: 'Bookings'}, inplace=True)
        if 'Type' in pos_df.columns:
            pos_df = pos_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        else:
            pos_df['Type'] = 'POS'
            pos_df = pos_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        dfs['POS'] = pos_df
    if role_map.get('XAAS'):
        xaas_df = pd.read_excel(role_map['XAAS'])
        xaas_so_col = find_column_name(xaas_df.columns, POSSIBLE_SO_COLS)
        xaas_bookings_col = find_column_name(xaas_df.columns, POSSIBLE_BOOKINGS_COLS)
        xaas_df.rename(columns={xaas_so_col: 'SO', xaas_bookings_col: 'Bookings'}, inplace=True)
        if 'Type' in xaas_df.columns:
            xaas_df = xaas_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        else:
            xaas_df['Type'] = 'XAAS'
            xaas_df = xaas_df.loc[:, ['SO', 'Bookings', 'Type']].copy()
        dfs['XAAS'] = xaas_df
    if role_map.get('MANREV'):
        manrev_df = pd.read_excel(role_map['MANREV'])
        manrev_df = manrev_df[['SO Number', 'Revenue (Original)', 'Type']].copy()
        manrev_df.rename(columns={'SO Number': 'SO', 'Revenue (Original)': 'Bookings'}, inplace=True)
        dfs['MANREV'] = manrev_df
    if role_map.get('CREMEMO'):
        crememo_df = pd.read_excel(role_map['CREMEMO'])
        crememo_df = crememo_df[['SO Number', 'Bookings', 'Type']].copy()
        crememo_df['SO'] = crememo_df['SO Number'].fillna(-9999)
        crememo_df['SO'] = crememo_df['SO'].replace('', -9999)
        crememo_df.drop(columns=['SO Number'], inplace=True)
        crememo_df = crememo_df[['SO', 'Bookings', 'Type']]
        dfs['CREMEMO'] = crememo_df
    # MBR is special: only used for comparison, not for combining
    mbr_file = role_map.get('MBR')
    if not dfs:
        print("No VSB files to process.")
        return None
    # Combine all available VSB dataframes
    combined_df = pd.concat([df for k, df in dfs.items() if k != 'MBR'], ignore_index=True)
    data_dir = os.path.dirname(list(role_map.values())[0])
    vsb_file = os.path.join(data_dir, 'vsb01small.xlsx')
    vsb_pivot_file = os.path.join(data_dir, 'vsb01pivot.xlsx')
    mbr_pivot_file = os.path.join(data_dir, 'mbr01pivot.xlsx')
    output_csv_path = os.path.join(data_dir, 'output.csv')
    combined_df.to_excel(vsb_file, index=False)
    # Step 1: Pivot (group by SO, sum Bookings)
    vsb_pivot, vsb_so_col, vsb_bookings_col = create_pivot(vsb_file, vsb_pivot_file)
    if mbr_file:
        mbr_pivot, mbr_so_col, mbr_bookings_col = create_pivot(mbr_file, mbr_pivot_file)
    else:
        print("No MBR file provided, skipping comparison.")
        return None
    # Step 2: Compare SOs with bookings > $25k
    comparison = compare_pivots(
        vsb_pivot, vsb_so_col, vsb_bookings_col,
        mbr_pivot, mbr_so_col, mbr_bookings_col
    )
    # --- Create and format output CSV ---
    results_df = pd.DataFrame(comparison, columns=['SO#', 'Vsb_Amount', 'MBR_Amount', 'Original_Status'])
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
    output_df = results_df[['SO#', 'MBR$', 'Vsb$', 'Delta$', 'isMatch', 'Type']]
    output_df.to_csv(output_csv_path, index=False)
    # Remove temp files
    for f in [vsb_file, vsb_pivot_file, mbr_pivot_file]:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass
    return output_csv_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--compare', nargs=6, help='Run compare_MBR_VSB with 6 Excel files: DIRECT, POS, XAAS, MANREV, CREMEMO, MBR')
    args = parser.parse_args()
    if args.compare:
        output_path = compare_MBR_VSB(args.compare)
        print(output_path)
    else:
        try:
            main()
        except (FileNotFoundError, ValueError) as e:
            print(f"Error: {e}")
