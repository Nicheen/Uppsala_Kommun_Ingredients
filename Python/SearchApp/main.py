import customtkinter as ctk # CustomTkinter for modern UI
import orjson # For faster JSON handling (needs to be imported)
import time # Time keeping

from eunovelfoods import fetch_all_novel_foods, create_searchable_index, quick_search
from app import NovelFoodSearch

if __name__ == '__main__':
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
    
    app = NovelFoodSearch()
    app.mainloop()
