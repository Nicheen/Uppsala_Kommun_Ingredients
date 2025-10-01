import customtkinter as ctk
import orjson
import re
from SearchApp.eunovelfoods import create_searchable_index, quick_search

class IngredientAnalyzer(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Ingredient Novel Food Analyzer")
        self.geometry("900x700")
        
        # Load data
        with open('novel_foods_complete.json', 'rb') as f:
            self.all_foods = orjson.loads(f.read())
        self.index = create_searchable_index(self.all_foods)
        
        # Instructions
        self.instruction_label = ctk.CTkLabel(
            self, 
            text="Paste ingredient list below:", 
            font=("Arial", 16)
        )
        self.instruction_label.pack(pady=(20, 10))
        
        # Input text box
        self.input_text = ctk.CTkTextbox(self, width=850, height=200)
        self.input_text.pack(pady=10, padx=20)
        
        # Analyze button
        self.analyze_button = ctk.CTkButton(
            self, 
            text="Analyze Ingredients", 
            command=self.analyze_ingredients,
            font=("Arial", 14)
        )
        self.analyze_button.pack(pady=10)
        
        # Results label
        self.results_label = ctk.CTkLabel(self, text="", font=("Arial", 12))
        self.results_label.pack(pady=5)
        
        # Output text box (scrollable)
        self.output_frame = ctk.CTkScrollableFrame(self, width=850, height=300)
        self.output_frame.pack(pady=10, padx=20, fill="both", expand=True)
    
    def extract_ingredients(self, text):
        """Extract individual ingredients from text"""
        # Remove bold markers
        text = text.replace("**", "")
        
        # Split by common patterns: commas, semicolons, or newlines
        ingredients = re.split(r'[,;\n]', text)
        
        extracted = []
        for ingredient in ingredients:
            ingredient = ingredient.strip()
            if not ingredient or ingredient.isupper():  # Skip empty or section headers
                continue
            
            # Extract common name and scientific name separately
            match = re.match(r'^([^(]+)(?:\(([^)]+)\))?', ingredient)
            if match:
                common_name = match.group(1).strip()
                scientific_name = match.group(2).strip() if match.group(2) else None
                
                extracted.append({
                    'common_name': common_name,
                    'scientific_name': scientific_name,
                    'full_text': ingredient
                })
        
        return extracted
    
    def check_novel_status(self, common_name, scientific_name):
        """Check if ingredient is a novel food using both names"""
        # Try scientific name first (usually more accurate)
        if scientific_name:
            results = quick_search(scientific_name, self.all_foods, self.index)
            if results:
                status = results[0].get('novel_food_status', '').lower()
                if 'novel food' in status and 'not novel' not in status:
                    return 'novel', results[0].get('novel_food_status')
                else:
                    return 'not_novel', results[0].get('novel_food_status')
        
        # Fall back to common name
        results = quick_search(common_name, self.all_foods, self.index)
        if results:
            status = results[0].get('novel_food_status', '').lower()
            if 'novel food' in status and 'not novel' not in status:
                return 'novel', results[0].get('novel_food_status')
            else:
                return 'not_novel', results[0].get('novel_food_status')
        
        return 'unknown', None
    
    def analyze_ingredients(self):
        # Clear previous results
        for widget in self.output_frame.winfo_children():
            widget.destroy()
        
        input_text = self.input_text.get("1.0", "end-1c")
        
        if not input_text.strip():
            self.results_label.configure(text="Please enter ingredients to analyze")
            return
        
        # Extract ingredients
        ingredients = self.extract_ingredients(input_text)
        
        # Analyze each ingredient
        novel_count = 0
        not_novel_count = 0
        unknown_count = 0
        
        for ing in ingredients:
            status, full_status = self.check_novel_status(
                ing['common_name'], 
                ing['scientific_name']
            )
            
            if status == 'novel':
                color = "#FF6B6B"  # Red
                novel_count += 1
            elif status == 'not_novel':
                color = "#51CF66"  # Green
                not_novel_count += 1
            else:
                color = "#FFA500"  # Orange for unknown
                unknown_count += 1
            
            # Create label with colored text
            label_text = ing['full_text']
            if full_status:
                label_text += f" [{full_status}]"
            
            label = ctk.CTkLabel(
                self.output_frame,
                text=label_text,
                text_color=color,
                anchor="w",
                font=("Arial", 12),
                wraplength=800
            )
            label.pack(pady=3, padx=10, fill="x")
        
        # Update summary
        summary = f"Novel: {novel_count} | Not Novel: {not_novel_count} | Unknown: {unknown_count}"
        self.results_label.configure(text=summary)

if __name__ == '__main__':
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
    
    app = IngredientAnalyzer()
    app.mainloop()