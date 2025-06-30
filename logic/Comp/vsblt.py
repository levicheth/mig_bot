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
MBR_EXTRA_COLS = ['End Customer Company Name', 'L4', 'Product Family', 'Month ID']

def find_column_name(df_columns, possible_names):
    """Finds the first matching column name from a list of possibilities."""
    for name in possible_names:
        if name in df_columns:
            return name
    return None

def get_mbr_details(filepath):
    """
    Checks if a file is an MBR file by looking for specific text in the first cell.
    Returns a tuple: (is_mbr, rows_to_skip)
    """
    try:
        # Read just the first cell of the file
        check_df = pd.read_excel(filepath, header=None, nrows=1, usecols=[0])
        cell_content = str(check_df.iloc[0, 0])
        
        if 'SS Bookings 360' in cell_content:
            return (True, 7) # This is a standard MBR file, skip 7 header rows
        elif 'Sales Order Number' in cell_content:
            return (True, 0) # This is a pre-processed MBR file, no rows to skip
    except Exception as e:
        # If the check fails, print an error for the user but don't crash
        print(f"Could not check file {filepath}. Error: {e}")
    return (False, 0) # Not an MBR file

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
def create_pivot(input_file, output_file, extra_cols=None):
    """Reads an Excel file, pivots it, and saves the pivot table."""
    df = pd.read_excel(input_file)
    
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

def main(data_dir=None):
    """Main function to execute the pivot and comparison logic."""
    # --- Step 0: Detect and rename files dynamically ---
    role_to_path = detectFilename(data_dir=data_dir)
    if not role_to_path:
        print("No recognized Excel files found in data folder.")
        return

    # Create a list of files that were actually found
    input_files = [f for f in role_to_path.values() if f]
    if not input_files:
        print("No valid input files to process.")
        return

    result_data = compare_MBR_VSB(input_files)
    
    output_path = result_data.get('output_file')
    if output_path and os.path.exists(output_path):
        print(f"\nComparison complete. Results saved to {output_path}")
        output_df = pd.read_csv(output_path)
        print("\n--- Preview of output.csv ---")
        print(output_df.to_string(index=False))
        if 'sum_missing' in result_data and 'count_missing' in result_data:
            print("\n--- Analysis ---")
            print(f"Sum of Missing VSB Bookings: ${result_data['sum_missing']:,.2f}")
            print(f"Count of Missing VSB Deals: {result_data['count_missing']}")
    else:
        print("No output.csv generated or comparison failed.")

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
        mbr_pivot, mbr_so_col, mbr_bookings_col = create_pivot(mbr_file, mbr_pivot_file, extra_cols=MBR_EXTRA_COLS)
    else:
        print("No MBR file provided, skipping comparison.")
        return None
    # Step 2: Compare SOs with bookings > $25k
    comparison = compare_pivots(
        vsb_pivot, vsb_so_col, vsb_bookings_col,
        mbr_pivot, mbr_so_col, mbr_bookings_col,
        extra_cols=MBR_EXTRA_COLS
    )
    # --- Create and format output CSV ---
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
    # Remove temp files
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
    parser = argparse.ArgumentParser(description="Compare VSB and MBR Excel files.")
    parser.add_argument(
        '--files', 
        nargs='*', 
        help='Run comparison with a specific list of Excel files.'
    )
    parser.add_argument(
        '--data-dir', 
        help='Path to a directory containing data files for local testing. The script will auto-detect files.'
    )
    parser.add_argument(
        '--mbr-detect',
        help='Run MBR detection test on a specific file.'
    )
    args = parser.parse_args()

    if args.mbr_detect:
        filepath = args.mbr_detect
        is_mbr, rows_to_skip = get_mbr_details(filepath)
        if is_mbr:
            print(f"'{filepath}' is detected as an MBR file. Rows to skip: {rows_to_skip}.")
        else:
            print(f"'{filepath}' is NOT detected as an MBR file.")
    elif args.files:
        result_data = compare_MBR_VSB(args.files)
        output_path = result_data.get('output_file')
        if output_path:
            print(f"Comparison successful. Output at: {output_path}")
            if 'sum_missing' in result_data and 'count_missing' in result_data:
                print(f"Sum of Missing VSB Bookings: ${result_data['sum_missing']:,.2f}")
                print(f"Count of Missing VSB Deals: {result_data['count_missing']}")
        else:
            print("Comparison failed or no output generated.")
    elif args.data_dir:
        main(data_dir=args.data_dir)
    else:
        try:
            main()  # Production mode: uses default DATA_DIR
        except (FileNotFoundError, ValueError) as e:
            print(f"Error: {e}")
