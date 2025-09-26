from livsmedelsverket import LivsmedelsverketAPI

if __name__ == '__main__':
    api = LivsmedelsverketAPI()

    print("Fetching food items with limit=10...")
    food_items = api.get_food_items(limit=10)  # Fixed method call
    if food_items:
        # Handle different possible response structures
        if isinstance(food_items, list):
            items = food_items
        elif isinstance(food_items, dict):
            items = food_items.get('data', food_items.get('items', []))
        else:
            items = []
            
        print(f"Found {len(items)} items")
        for item in items[:5]:  # Show first 5
            # Use the correct field names from the documentation
            nummer = item.get('Nummer', item.get('nummer', item.get('id', 'N/A')))
            namn = item.get('Namn', item.get('namn', 'N/A'))
            typ = item.get('Typ', item.get('typ', 'N/A'))
            print(f"  - {namn} (ID: {nummer}, Type: {typ})")
    else:
        print("No food items returned or error occurred")
        
    print("\n" + "="*50 + "\n")
    
    # Test getting a specific food item by ID
    print("Testing specific food item (ID: 1):")
    api_v2 = LivsmedelsverketAPI()
    
    # Test the specific endpoint
    try:
        response = api_v2.session.get(f"{api_v2.base_url}/api/v1/livsmedel/1")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            food_detail = response.json()
            print(f"Food name: {food_detail.get('Namn', food_detail.get('namn', 'N/A'))}")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")