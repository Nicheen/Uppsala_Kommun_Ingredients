import urllib.request
import json
import time

def fetch_all_novel_foods():
    all_items = []
    url = "https://api.datalake.sante.service.ec.europa.eu/novel-food-catalog/novel_food_catalog_list?format=json&api-version=v1.0"
    
    page_count = 0
    
    while url:
        try:
            print(f"\nFetching page {page_count + 1}...")
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
            req.add_header('Accept', 'application/json')
            
            response = urllib.request.urlopen(req, timeout=30)
            data = json.loads(response.read().decode('utf-8'))
            
            # DEBUG: Print all top-level keys
            print(f"Response keys: {list(data.keys())}")
            
            items = data.get('value', [])
            all_items.extend(items)
            page_count += 1
            
            print(f"  - Got {len(items)} items")
            print(f"  - Total: {len(all_items)}")
            
            # Try different possible nextLink field names
            url = (data.get('@odata.nextLink') or 
                   data.get('nextLink') or 
                   data.get('@odata.next') or
                   data.get('odata.nextLink'))
            
            if url:
                print(f"  - Next URL found: {url[:80]}...")
                time.sleep(0.5)
            else:
                print("  - No nextLink field found")
                # DEBUG: Show full response structure (first 500 chars)
                print(f"\nFull response preview:\n{json.dumps(data, indent=2)[:500]}...")
                break
                
        except Exception as e:
            print(f"Error: {type(e).__name__} - {e}")
            break
    
    print(f"\nTotal items fetched: {len(all_items)}")
    return all_items

def create_searchable_index(foods_list):
    """Create an index for faster searches"""
    index = {}
    for i, food in enumerate(foods_list):
        # Index by name
        name = food.get('novel_food_name', '').lower()
        if name:
            index[name] = index.get(name, []) + [i]
        
        # Index by common name
        common_name = food.get('common_name', '')
        if common_name:
            common_name_lower = common_name.lower()
            index[common_name_lower] = index.get(common_name_lower, []) + [i]
        
        # Index by code
        code = food.get('policy_item_code', '').lower()
        if code:
            index[code] = index.get(code, []) + [i]
        
        # Index by synonyms (if you want to search those too)
        synonyms = food.get('synonyms', '')
        if synonyms:
            synonyms_lower = synonyms.lower()
            index[synonyms_lower] = index.get(synonyms_lower, []) + [i]
    
    return index

def quick_search(term, foods_list, index):
    results = []
    term_lower = term.lower()
    
    for key, indices in index.items():
        if term_lower in key:
            for idx in indices:
                if foods_list[idx] not in results:
                    results.append(foods_list[idx])
    
    return results

if __name__ == '__main__':
    all_novel_foods = fetch_all_novel_foods()

    if all_novel_foods:
        with open('novel_foods_complete.json', 'w', encoding='utf-8') as f:
            json.dump(all_novel_foods, f, indent=2, ensure_ascii=False)
        print(f"Saved to 'novel_foods_complete.json'")