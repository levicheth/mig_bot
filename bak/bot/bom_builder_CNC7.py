import pandas as pd
import os
import re
from pathlib import Path
from typing import Dict

def process_quote(input_csv_content: str) -> str:
    """
    Process the input content and generate BOM output
    
    Args:
        input_csv_content (str): Input in CSV format
        
    Returns:
        str: Processed output in CSV format
    """
    try:
        # Read mapper data
        data_dir = Path(__file__).parent.parent / 'data'
        mapper_df = pd.read_csv(data_dir / 'mapper.csv')
        
        # Create mapper lookup
        device_mapper = {
            row['deviceType']: row['cncType']
            for _, row in mapper_df.iterrows()
        }
        
        # Read and process input
        input_df = pd.read_csv(pd.StringIO(input_csv_content))
        
        # Process each line
        cnc_type_groups: Dict[str, int] = {}
        
        for _, row in input_df.iterrows():
            device_type = str(row['type']).strip()
            
            # Check if device exists in mapper
            if device_type not in device_mapper:
                raise ValueError(f"Device type not found: {device_type}")
            
            try:
                quantity = int(row['count'])
                if quantity <= 0:
                    raise ValueError
            except (ValueError, TypeError):
                raise ValueError(f"Invalid quantity for {device_type}: {row['count']}")
            
            # Get CNC type and accumulate quantity
            cnc_type = device_mapper[device_type]
            cnc_type_groups[cnc_type] = cnc_type_groups.get(cnc_type, 0) + quantity
        
        # Format output
        output_df = pd.DataFrame([
            {'Type': cnc_type, 'Qty': qty}
            for cnc_type, qty in cnc_type_groups.items()
        ])
        
        return output_df.to_csv(index=False)
        
    except Exception as e:
        print(f"Error processing quote: {str(e)}")
        raise ValueError(str(e)) 