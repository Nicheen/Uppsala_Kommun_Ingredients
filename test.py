"""
Läkemedelsverket Ämnesguiden (Substance Guide) Web Scraper

This script scrapes substance information from the Swedish Medical Products Agency's
substance guide to determine if ingredients are classified as medicines or not.

Requirements:
    pip install selenium beautifulsoup4 webdriver-manager
    
Usage:
    python lakemedelsverket_scraper.py
"""

import json
import time
from datetime import datetime
from typing import List, Dict, Optional
import sys

print("Starting script...")
print(f"Python version: {sys.version}")

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    from webdriver_manager.chrome import ChromeDriverManager
    from bs4 import BeautifulSoup
    print("✓ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("\nPlease install required packages:")
    print("pip install selenium beautifulsoup4 webdriver-manager")
    sys.exit(1)


class LakemedelsverketScraper:
    """Scraper for Läkemedelsverket's Ämnesguiden (Substance Guide)"""
    
    BASE_URL = "https://www.lakemedelsverket.se/sv/behandling-och-forskrivning/kopa-anvanda-och-hantera/vad-ar-ett-lakemedel/amnesguiden"
    
    def __init__(self, headless: bool = True):
        """Initialize the scraper with Selenium WebDriver"""
        self.headless = headless
        self.driver = None
        self.substances = []
        print(f"Initializing scraper (headless={headless})")
        
    def setup_driver(self):
        """Configure and initialize Chrome WebDriver"""
        print("\n🔧 Setting up Chrome WebDriver...")
        
        try:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            # Install and setup ChromeDriver automatically
            print("Downloading/updating ChromeDriver...")
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            print("✓ WebDriver initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Error setting up driver: {e}")
            return False
        
    def wait_for_page_load(self, timeout: int = 20):
        """Wait for the page to fully load"""
        try:
            print(f"Waiting for page to load (timeout: {timeout}s)...")
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.ID, "hmainbody1"))
            )
            time.sleep(3)
            print("✓ Page loaded successfully")
            return True
        except TimeoutException:
            print(f"⚠️ Timeout waiting for page to load after {timeout} seconds")
            return False
        except Exception as e:
            print(f"❌ Error waiting for page: {e}")
            return False
    
    def expand_all_accordions(self):
        """Click all accordion items to expand them"""
        try:
            print("\n📂 Finding accordion items...")
            
            # Try multiple selectors
            selectors = [
                ".accordion-item__top",
                "button.accordion-item__top",
                ".accordion-item button"
            ]
            
            accordion_buttons = []
            for selector in selectors:
                accordion_buttons = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if accordion_buttons:
                    print(f"✓ Found {len(accordion_buttons)} accordion items using selector: {selector}")
                    break
            
            if not accordion_buttons:
                print("⚠️ No accordion buttons found!")
                return False
            
            print("Expanding accordions...")
            expanded_count = 0
            
            for i, button in enumerate(accordion_buttons):
                try:
                    # Scroll to element
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                    time.sleep(0.2)
                    
                    # Check if already expanded
                    is_expanded = button.get_attribute("aria-expanded")
                    if is_expanded != "true":
                        button.click()
                        expanded_count += 1
                        time.sleep(0.15)
                    
                    if (i + 1) % 20 == 0:
                        print(f"  Progress: {i + 1}/{len(accordion_buttons)} processed ({expanded_count} expanded)")
                        
                except Exception as e:
                    print(f"  Could not process accordion {i}: {e}")
                    continue
            
            print(f"✓ Expanded {expanded_count} accordions")
            time.sleep(2)
            return True
            
        except Exception as e:
            print(f"❌ Error expanding accordions: {e}")
            return False
    
    def extract_substance_from_accordion(self, accordion_soup) -> Optional[Dict]:
        """Extract substance data from a single accordion item"""
        try:
            # Get the substance name from button/header
            name_elem = accordion_soup.select_one('.accordion-item__top strong')
            if not name_elem:
                name_elem = accordion_soup.find('strong')
            
            if not name_elem:
                return None
            
            substance_name = name_elem.get_text(strip=True)
            
            # Extract the content
            content_div = accordion_soup.select_one('.accordion-item__content')
            if not content_div:
                return None
            
            # Initialize data
            substance_data = {
                'name': substance_name,
                'synonyms': [],
                'classification': '',
                'is_medicine': None,
                'description': '',
                'comment': '',
                'scraped_at': datetime.now().isoformat()
            }
            
            # Get all text content
            all_text = content_div.get_text(separator='\n', strip=True)
            lines = [line.strip() for line in all_text.split('\n') if line.strip()]
            
            # Parse the content
            for i, line in enumerate(lines):
                if line.startswith('Synonymer:'):
                    syn_text = line.replace('Synonymer:', '').strip()
                    substance_data['synonyms'] = [s.strip() for s in syn_text.split(',') if s.strip()]
                
                elif line.startswith('Läkemedel:') or 'Läkemedel:' in line:
                    classification = line.replace('Läkemedel:', '').strip()
                    substance_data['classification'] = classification
                    
                    if classification.startswith('Ja'):
                        substance_data['is_medicine'] = True
                    elif classification.startswith('Nej'):
                        substance_data['is_medicine'] = False
                    
                    # Get description from next lines
                    if i + 1 < len(lines):
                        desc_lines = []
                        for j in range(i + 1, len(lines)):
                            if lines[j].startswith('Kommentar:'):
                                break
                            desc_lines.append(lines[j])
                        substance_data['description'] = ' '.join(desc_lines)
                
                elif line.startswith('Kommentar:'):
                    comment = line.replace('Kommentar:', '').strip()
                    if i + 1 < len(lines):
                        comment += ' ' + ' '.join(lines[i+1:])
                    substance_data['comment'] = comment
            
            return substance_data
            
        except Exception as e:
            print(f"  Warning: Error parsing item: {e}")
            return None
    
    def scrape_all_substances(self) -> List[Dict]:
        """Main scraping method"""
        print("\n" + "="*60)
        print("🚀 Starting Ämnesguiden scraping process")
        print("="*60)
        
        try:
            # Navigate to page
            print(f"\n🌐 Loading page: {self.BASE_URL}")
            self.driver.get(self.BASE_URL)
            
            # Wait for load
            if not self.wait_for_page_load():
                print("❌ Failed to load page")
                return []
            
            # Screenshot
            try:
                self.driver.save_screenshot("amnesguiden_initial.png")
                print("✓ Screenshot saved: amnesguiden_initial.png")
            except:
                pass
            
            # Expand accordions
            if not self.expand_all_accordions():
                print("⚠️ Could not expand accordions, continuing anyway...")
            
            # Screenshot after expanding
            try:
                self.driver.save_screenshot("amnesguiden_expanded.png")
                print("✓ Screenshot saved: amnesguiden_expanded.png")
            except:
                pass
            
            # Parse HTML
            print("\n📝 Parsing HTML...")
            page_source = self.driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Find all accordion items
            accordion_items = soup.find_all('accordion-item', class_='accordion-item')
            
            if not accordion_items:
                print("⚠️ No accordion items found with tag 'accordion-item', trying divs...")
                accordion_items = soup.find_all('div', class_='accordion-item')
            
            print(f"✓ Found {len(accordion_items)} items to process")
            
            if len(accordion_items) == 0:
                print("❌ No items found! Check the HTML structure.")
                # Save HTML for debugging
                with open("page_debug.html", "w", encoding="utf-8") as f:
                    f.write(page_source)
                print("✓ Saved page HTML to page_debug.html for inspection")
                return []
            
            # Extract data
            print("\n⚙️ Extracting substance data...")
            for i, accordion in enumerate(accordion_items):
                substance_data = self.extract_substance_from_accordion(accordion)
                if substance_data:
                    self.substances.append(substance_data)
                
                if (i + 1) % 50 == 0:
                    print(f"  Processed {i + 1}/{len(accordion_items)} substances")
            
            print(f"\n✓ Successfully extracted {len(self.substances)} substances")
            return self.substances
            
        except Exception as e:
            print(f"\n❌ Fatal error during scraping: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def save_to_json(self, filename: str = "lakemedelsverket_substances.json"):
        """Save scraped substances to JSON file"""
        try:
            print(f"\n💾 Saving data to {filename}...")
            
            medicines = [s for s in self.substances if s.get('is_medicine') == True]
            not_medicines = [s for s in self.substances if s.get('is_medicine') == False]
            unknown = [s for s in self.substances if s.get('is_medicine') is None]
            
            output = {
                'metadata': {
                    'source': 'Läkemedelsverket Ämnesguiden',
                    'url': self.BASE_URL,
                    'scraped_at': datetime.now().isoformat(),
                    'total_substances': len(self.substances),
                    'medicines_count': len(medicines),
                    'not_medicines_count': len(not_medicines),
                    'unknown_count': len(unknown)
                },
                'substances': self.substances,
                'by_classification': {
                    'medicines': medicines,
                    'not_medicines': not_medicines,
                    'unknown': unknown
                }
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            
            print(f"✓ Data saved successfully!")
            print(f"\n📊 Summary Statistics:")
            print(f"   Total substances: {len(self.substances)}")
            print(f"   Classified as medicine: {len(medicines)}")
            print(f"   Not medicine: {len(not_medicines)}")
            print(f"   Unknown: {len(unknown)}")
            
            return True
        except Exception as e:
            print(f"❌ Error saving to JSON: {e}")
            return False
    
    def close(self):
        """Close the browser"""
        if self.driver:
            try:
                self.driver.quit()
                print("\n✓ Browser closed")
            except:
                pass


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("Läkemedelsverket Ämnesguiden Scraper")
    print("="*60 + "\n")
    
    scraper = None
    
    try:
        # Create scraper (headless=False to see browser)
        scraper = LakemedelsverketScraper(headless=False)
        
        # Setup browser
        if not scraper.setup_driver():
            print("\n❌ Failed to setup driver. Exiting.")
            return
        
        # Scrape all substances
        substances = scraper.scrape_all_substances()
        
        # Save to JSON
        if substances:
            scraper.save_to_json("lakemedelsverket_substances.json")
            
            print("\n" + "="*60)
            print("✅ SCRAPING COMPLETE!")
            print("="*60)
            print(f"\n📁 Output file: lakemedelsverket_substances.json")
            print(f"📸 Screenshots: amnesguiden_initial.png, amnesguiden_expanded.png")
            
            # Show examples
            print("\n📋 Sample substances:")
            for sub in substances[:5]:
                status = "✓ Medicine" if sub['is_medicine'] else "✗ Not medicine" if sub['is_medicine'] is False else "? Unknown"
                print(f"  {status}: {sub['name']}")
        else:
            print("\n⚠️ No substances were scraped. Check the errors above.")
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if scraper:
            scraper.close()
        print("\nScript finished.\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")