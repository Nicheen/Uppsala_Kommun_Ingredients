import json
import requests

class LivsmedelsverketAPI:
    def __init__(self):
        self.base_url = "https://dataportal.livsmedelsverket.se/livsmedel"
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
    
    def get_food_items(self, search_term=None, limit=None):
        endpoint = f"{self.base_url}/api/v1/livsmedel"
        params = {}

        if search_term:
            params['search'] = search_term
        if limit:
            params['limit'] = limit
        
        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching food items: {e}")
            return None
    
    def search_nutrients(self, nutrient_name=None):
        endpoint = f"{self.base_url}/api/naringsamnen"
        params = {}

        if nutrient_name:
            params['search'] = nutrient_name
        
        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching nutrients: {e}")
            return None
        