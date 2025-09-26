from livsmedelsverket import LivsmedelsverketAPI

if __name__ == '__main__':
    api = LivsmedelsverketAPI()
    
    try:
        for id in range(1, 1000):
            response = api.session.get(f"{api.base_url}/api/v1/livsmedel/{id}")
            if response.status_code == 200:
                food_detail = response.json()
                print(f"✅ {id}: {food_detail.get('Namn', food_detail.get('namn', 'N/A'))}")
            
    except Exception as e:
        print(f"Error: {e}")