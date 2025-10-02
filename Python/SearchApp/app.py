import customtkinter as ctk
import orjson
from eunovelfoods import fetch_all_novel_foods, create_searchable_index, quick_search

class NovelFoodSearch(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Novel Food Search")
        self.geometry("800x600")
        
        with open('novel_foods_complete.json', 'r', encoding='utf-8') as f:
            self.all_foods = orjson.loads(f.read())
        self.index = create_searchable_index(self.all_foods)

        self.search_label = ctk.CTkLabel(self, text="Search Novel Food:", font=("Arial", 16))
        self.search_label.pack(pady=(20, 10))

        self.search_entry = ctk.CTkEntry(self, width=600, placeholder_text="Enter search term...")
        self.search_entry.pack(pady=10)
        self.search_entry.bind("<Return>", self.on_search)

        self.results_label = ctk.CTkLabel(self, text="Results: 0", font=("Arial", 12))
        self.results_label.pack(pady=5)

        self.results_frame = ctk.CTkScrollableFrame(self, width=750, height=00)
        self.results_frame.pack(pady=10, padx=20, fill="both", expand=True)
        
        self.result_labels = []
    
    def on_search(self, event):
        search_term = self.search_entry.get().strip()
        
        # Clear previous results
        for label in self.result_labels:
            label.destroy()
        self.result_labels.clear()
        
        if not search_term:
            self.results_label.configure(text="Results: 0")
            return
        
        # Perform search
        results = quick_search(search_term, self.all_foods, self.index)
        
        # Limit to 30 items
        display_results = results[:30]
        total_count = len(results)
        
        # Update results label
        if total_count > 30:
            self.results_label.configure(text=f"Results: {total_count} (showing first 30)")
        else:
            self.results_label.configure(text=f"Results: {total_count}")
        
        # In your NovelFoodSearch class, update the display results section:

        # Display results
        for result in display_results:
            name = result.get('novel_food_name', 'N/A')
            common_name = result.get('common_name', '')
            status = result.get('novel_food_status', 'N/A')
            
            # Color code based on status
            if status.lower() == 'novel food':
                text_color = "#FF6B6B"  # Red for novel
            else:
                text_color = "#51CF66"  # Green for not novel
            
            # Include common name if available
            if common_name:
                result_text = f"{name} ({common_name}) - {status}"
            else:
                result_text = f"{name} - {status}"
            
            label = ctk.CTkLabel(
                self.results_frame, 
                text=result_text, 
                text_color=text_color,
                anchor="w",
                font=("Arial", 12)
            )
            label.pack(pady=2, padx=10, fill="x")
            self.result_labels.append(label)
