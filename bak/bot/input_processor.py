from typing import NamedTuple, List

class ValidatedInput(NamedTuple):
    """Container for input data"""
    csv_content: str
    raw_lines: List[str]

def parse_message_to_csv(message_text: str) -> ValidatedInput:
    """
    Parse message text into CSV format
    
    Args:
        message_text (str): Raw message text from Webex
        
    Returns:
        ValidatedInput: Processed input data
    """
    lines = [line.strip() for line in message_text.split('\n') if line.strip()]
    
    csv_content = 'type,count\n' + '\n'.join(lines)
    
    return ValidatedInput(
        csv_content=csv_content,
        raw_lines=lines
    )

def format_error_message(error: Exception) -> str:
    """Format error message for user response"""
    base_message = (
        "Error processing input. Please provide device types and quantities like:\n"
        "8101-32H,1\n"
        "8102-64H,2"
    )
    return f"{str(error)}\n\n{base_message}" 