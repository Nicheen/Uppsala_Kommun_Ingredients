import json
import re

def parse_pharmaceutical_data(file_path):
    """
    Parse the Swedish pharmaceutical text file and convert to JSON.
    Uses a more robust state-machine approach.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove footer
    content = content.split('Välj sidfotens innehåll')[0]
    lines = [line.strip() for line in content.strip().split('\n')]
    
    compounds = []
    i = 0
    
    # Keywords that indicate field labels
    field_labels = {'Synonymer', 'Synonym', 'Läkemedel', 'Kommentar'}
    
    while i < len(lines):
        line = lines[i]
        
        # Skip empty lines
        if not line:
            i += 1
            continue
        
        # Skip if this is a field label
        if line in field_labels:
            i += 1
            continue
            
        # This should be a compound name
        # It's a compound if it's not a field label and not obviously data
        if (not line.startswith('Ja,') and 
            not line.startswith('Nej,') and
            not any(line.startswith(label) for label in field_labels)):
            
            compound_name = line
            compound = {
                'name': compound_name,
                'synonyms': [],
                'is_medicine': None,
                'comment': None
            }
            
            i += 1
            
            # Now parse the fields for this compound
            while i < len(lines):
                current_line = lines[i].strip()
                
                if not current_line:
                    i += 1
                    continue
                
                # Check if we've hit a new compound (not a field label or data)
                if (current_line not in field_labels and
                    not current_line.startswith('Ja,') and
                    not current_line.startswith('Nej,') and
                    not any(current_line.startswith(label + 'er') for label in ['Synonym'])):
                    # This looks like a new compound name
                    # Check if the previous compound has at least some data
                    if compound['is_medicine'] is not None or compound['synonyms'] or compound['comment']:
                        # Save current compound and don't increment i (process this line as new compound)
                        break
                    else:
                        # This might be part of the previous entry, skip it
                        i += 1
                        continue
                
                # Parse Synonymer/Synonym
                if current_line.startswith('Synonym'):
                    i += 1
                    # Collect synonym lines until we hit another field or compound
                    synonym_text = []
                    while i < len(lines) and lines[i].strip():
                        next_line = lines[i].strip()
                        if next_line in field_labels or next_line.startswith('Ja,') or next_line.startswith('Nej,'):
                            break
                        synonym_text.append(next_line)
                        i += 1
                    
                    if synonym_text:
                        # Join and split by comma
                        full_text = ' '.join(synonym_text)
                        compound['synonyms'] = [s.strip() for s in full_text.split(',') if s.strip()]
                    continue
                
                # Parse Läkemedel
                elif current_line == 'Läkemedel':
                    i += 1
                    if i < len(lines):
                        med_line = lines[i].strip()
                        if med_line.startswith('Ja'):
                            compound['is_medicine'] = True
                            i += 1
                        elif med_line.startswith('Nej'):
                            compound['is_medicine'] = False
                            i += 1
                    continue
                
                # Parse Kommentar
                elif current_line == 'Kommentar':
                    i += 1
                    # Collect comment lines
                    comment_lines = []
                    while i < len(lines) and lines[i].strip():
                        next_line = lines[i].strip()
                        if next_line in field_labels:
                            break
                        # Stop if we hit what looks like a new compound name
                        if (not next_line.startswith('Ja,') and 
                            not next_line.startswith('Nej,') and
                            len(comment_lines) > 0):  # Already have some comment
                            # Check if this looks like a field continuation or new entry
                            if next_line[0].isupper() and len(next_line) < 80:
                                break
                        comment_lines.append(next_line)
                        i += 1
                    
                    if comment_lines:
                        compound['comment'] = ' '.join(comment_lines)
                    continue
                
                else:
                    i += 1
            
            # Only add compound if it has valid data
            if compound['is_medicine'] is not None or compound['synonyms'] or compound['comment']:
                compounds.append(compound)
        else:
            i += 1
    
    return compounds

def main():
    input_file = 'Nytt textdokument.txt'
    output_file = 'pharmaceutical_data.json'
    
    print(f"Parsing {input_file}...")
    compounds = parse_pharmaceutical_data(input_file)
    
    print(f"Found {len(compounds)} compounds")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(compounds, f, ensure_ascii=False, indent=2)
    
    print(f"Data saved to {output_file}")
    
    # Print first few entries
    print("\nFirst 5 entries:")
    for compound in compounds[:5]:
        print(json.dumps(compound, ensure_ascii=False, indent=2))
        print()

if __name__ == "__main__":
    main()