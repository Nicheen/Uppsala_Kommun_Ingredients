import requests
import json

# ANSI color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
RESET = '\033[0m'
CHECKMARK = '✓'
CROSS = '✗'

def get_novel_foods():
    """
    Fetch novel foods data from the EU API using the download endpoint
    """
    api_url = "https://api.datalake.sante.service.ec.europa.eu/novel-food-catalog/download"
    
    params = {
        'format': 'json',
        'api-version': 'v1.0'
    }
    
    headers = {
        'Accept': 'application/json'
    }
    
    try:
        print("Connecting to EU Novel Foods API...")
        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

def check_novel_status(item):
    """
    Determine if an item is novel or not based on novel_food_status field
    
    According to EU documentation, novel foods are those that require authorization
    or have specific novel food statuses indicating they are novel.
    """
    status = item.get('novel_food_status', '').lower()
    
    # Foods with these statuses are considered NOVEL (require authorization)
    novel_indicators = [
        'novel',
        'authorization',
        'authorisation',
        'not authorized',
        'not authorised',
        'application',
        'pending'
    ]
    
    # Foods with these statuses are NOT novel (traditional/authorized use)
    non_novel_indicators = [
        'not novel',
        'traditional',
        'history of use',
        'no authorization required'
    ]
    
    # Check for non-novel first
    if any(indicator in status for indicator in non_novel_indicators):
        return False
    
    # Then check for novel
    if any(indicator in status for indicator in novel_indicators):
        return True
    
    # If status is empty or unclear, check the description
    status_desc = item.get('novel_food_status_dec', '').lower()
    if 'not novel' in status_desc or 'history of use' in status_desc:
        return False
    
    # Default to novel if uncertain (safer for regulatory purposes)
    return True

def display_items(items):
    """
    Display each item with color-coded status
    """
    if not items:
        print("No items to display")
        return
    
    print("\n" + "="*80)
    print("EU NOVEL FOODS STATUS CHECK")
    print("="*80 + "\n")
    
    novel_count = 0
    non_novel_count = 0
    
    for item in items:
        name = item.get('novel_food_display_name', item.get('novel_food_name', 'Unknown'))
        is_novel = check_novel_status(item)
        status = item.get('novel_food_status', 'Unknown status')
        
        if is_novel:
            print(f"{RED}{CROSS}{RESET} {name} - NOVEL FOOD ({status})")
            novel_count += 1
        else:
            print(f"{GREEN}{CHECKMARK}{RESET} {name} - NOT NOVEL ({status})")
            non_novel_count += 1
    
    print("\n" + "="*80)
    print(f"Summary: {GREEN}{non_novel_count} Not Novel{RESET} | {RED}{novel_count} Novel{RESET}")
    print("="*80 + "\n")

def main():
    print("Fetching novel foods data from EU API...\n")
    
    data = get_novel_foods()
    
    if data:
        # The API returns a list of items directly
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            # Fallback if structure is different
            items = data.get('value', data.get('items', data.get('data', [])))
        else:
            items = []
        
        if items:
            print(f"Retrieved {len(items)} items from the database.\n")
            display_items(items)
        else:
            print("No items found in the response.")
    else:
        print("Failed to retrieve data from API")

if __name__ == "__main__":
    main()