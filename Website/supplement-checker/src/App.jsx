import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [novelFoods, setNovelFoods] = useState([]);
  const [pharmaceuticals, setPharmaceuticals] = useState([]);
  const [ingredientsList, setIngredientsList] = useState('');
  const [analyzedIngredients, setAnalyzedIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(null);
  const [novelFoodsMap, setNovelFoodsMap] = useState(null);
  const [pharmaMap, setPharmaMap] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const searchCacheRef = useRef(new Map());

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setIngredientsList(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight to fit content
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Load both datasets
  useEffect(() => {
    const loadData = async () => {
      try {
        const [novelResponse, pharmaResponse] = await Promise.all([
          fetch('/novel_foods_catalogue.json'),
          fetch('/pharmaceutical_data.json')
        ]);

        // Check if responses are ok
        if (!novelResponse.ok || !pharmaResponse.ok) {
          throw new Error('Failed to load database files');
        }

        const novelData = await novelResponse.json();
        const pharmaData = await pharmaResponse.json();

        // Validate data structure
        if (!Array.isArray(novelData) || !Array.isArray(pharmaData)) {
          throw new Error('Invalid data format');
        }

        setNovelFoods(novelData);
        setPharmaceuticals(pharmaData);

        // Create hash maps for O(1) exact lookups
        const novelMap = new Map();
        novelData.forEach(food => {
          const addToMap = (key, item) => {
            if (!key || typeof key !== 'string') return; // Safety check
            const lowerKey = key.toLowerCase();
            if (!novelMap.has(lowerKey)) {
              novelMap.set(lowerKey, []);
            }
            novelMap.get(lowerKey).push(item);
          };

          if (food && food.novel_food_name) {
            addToMap(food.novel_food_name, food);
            if (food.common_name) addToMap(food.common_name, food);
            if (food.synonyms) addToMap(food.synonyms, food);
          }
        });

        const pharmaMapInstance = new Map();
        pharmaData.forEach(pharma => {
          const addToMap = (key, item) => {
            if (!key || typeof key !== 'string') return; // Safety check
            const lowerKey = key.toLowerCase();
            if (!pharmaMapInstance.has(lowerKey)) {
              pharmaMapInstance.set(lowerKey, []);
            }
            pharmaMapInstance.get(lowerKey).push(item);
          };

          if (pharma && pharma.name) {
            addToMap(pharma.name, pharma);
            if (pharma.synonyms && Array.isArray(pharma.synonyms)) {
              pharma.synonyms.forEach(syn => addToMap(syn, pharma));
            }
          }
        });

        setNovelFoodsMap(novelMap);
        setPharmaMap(pharmaMapInstance);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError(error.message || 'Failed to load databases');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Analyze ingredients when user enters them
  const analyzeIngredients = () => {
    if (ingredientsList.trim() === '') {
      setAnalyzedIngredients([]);
      setAnalysisTime(null);
      setSelectedIngredient(null); // Clear selection when clearing results
      return;
    }

    // Clear selected ingredient when re-analyzing
    setSelectedIngredient(null);

    const startTime = performance.now();

    // Split by comma, semicolon, or newline, but NOT if inside parentheses
    const ingredients = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < ingredientsList.length; i++) {
      const char = ingredientsList[i];

      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        // Prevent negative depth from unmatched parentheses
        if (parenDepth > 0) {
          parenDepth--;
        }
        current += char;
      } else if ((char === ',' || char === ';' || char === '\n') && parenDepth === 0) {
        // Split here only if we're not inside parentheses
        if (current.trim()) {
          ingredients.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last ingredient
    if (current.trim()) {
      ingredients.push(current.trim());
    }

    const analyzed = ingredients.map(ingredient => {
      // Parse ingredient to extract main name and parenthetical name
      const match = ingredient.match(/^([^(]+)(?:\(([^)]+)\))?/);
      const mainName = match ? match[1].trim() : ingredient;
      const parentheticalContent = match && match[2] ? match[2].trim() : null;

      // Build search terms
      const searchTerms = [];

      if (parentheticalContent) {
        // Check if parenthetical content has multiple items separated by commas
        if (parentheticalContent.includes(',')) {
          // Multiple items in parentheses - treat each as a separate search term
          // The text before parentheses is likely descriptive (e.g., "Klumpförebyggande medel")
          const parentheticalItems = parentheticalContent
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
          searchTerms.push(...parentheticalItems);
        } else {
          // Single item in parentheses - search both main name and parenthetical
          searchTerms.push(mainName);
          searchTerms.push(parentheticalContent);
        }
      } else {
        // No parentheses - just search the ingredient name
        searchTerms.push(mainName);
      }

      // Collect all matches for both search terms
      const allMatches = {
        novel: [],
        pharma: []
      };

      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        const cacheKey = `${termLower}`;

        // Check cache first
        if (searchCacheRef.current.has(cacheKey)) {
          const cached = searchCacheRef.current.get(cacheKey);
          if (cached.novel) allMatches.novel.push({ term, ...cached.novel });
          if (cached.pharma) allMatches.pharma.push({ term, ...cached.pharma });
          return;
        }

        const cacheEntry = {};

        // First try exact matching using hash map (O(1) lookup)
        const exactNovelMatches = novelFoodsMap ? novelFoodsMap.get(termLower) : null;
        const exactPharmaMatches = pharmaMap ? pharmaMap.get(termLower) : null;

        // If exact match found, use it
        if (exactNovelMatches && exactNovelMatches.length > 0) {
          const match = {
            result: { item: exactNovelMatches[0], score: 0 },
            matchType: 'exact'
          };
          allMatches.novel.push({ term, ...match });
          cacheEntry.novel = match;
        }
        // Skip fuzzy search for novel foods to improve performance
        // Novel foods are rarely misspelled in ingredient lists

        if (exactPharmaMatches && exactPharmaMatches.length > 0) {
          const match = {
            result: { item: exactPharmaMatches[0], score: 0 },
            matchType: 'exact'
          };
          allMatches.pharma.push({ term, ...match });
          cacheEntry.pharma = match;
        }
        // Skip fuzzy search for pharma too for better performance

        // Store in cache with size limit to prevent memory leaks
        const MAX_CACHE_SIZE = 1000;
        if (searchCacheRef.current.size >= MAX_CACHE_SIZE) {
          // Clear oldest entries when cache gets too large
          const firstKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(firstKey);
        }
        searchCacheRef.current.set(cacheKey, cacheEntry);
      });

      // Determine overall status based on all matches
      let status = 'unknown'; // neutral - default to unknown if no match
      let statusText = 'No information';
      let details = null;

      // Check if any match is pharmaceutical medicine (highest priority)
      const pharmaMatch = allMatches.pharma.find(m => m.result.item.is_medicine);
      // Check if any match is pharmaceutical (non-medicine) = safe
      const safePharmaMatch = allMatches.pharma.find(m => !m.result.item.is_medicine);

      if (pharmaMatch) {
        status = 'danger';
        statusText = 'Pharmaceutical drug';
        details = {
          source: 'multiple',
          matches: allMatches,
          primaryMatch: pharmaMatch
        };
      }
      // Safe pharmaceutical overrides novel food
      else if (safePharmaMatch) {
        status = 'safe';
        statusText = 'Safe';
        details = {
          source: 'multiple',
          matches: allMatches,
          primaryMatch: safePharmaMatch
        };
      }
      // Check if any match is novel food
      else if (allMatches.novel.length > 0) {
        status = 'info';
        statusText = 'Novel Food (informational)';
        details = {
          source: 'multiple',
          matches: allMatches,
          primaryMatch: allMatches.novel[0]
        };
      }

      return {
        name: ingredient,
        status,
        statusText,
        details
      };
    });

    const endTime = performance.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(3); // Convert to seconds

    setAnalyzedIngredients(analyzed);
    setAnalysisTime(timeTaken);
  };

  // Safely strip HTML tags without using innerHTML (prevents XSS)
  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div className="app-container">
      <div className="max-width">
        {/* Header */}
        <div className="card header">
          <div className="header-content">
            <div>
              <h1>Ingredient Safety Checker</h1>
              <p>
                Search the EU Novel Foods Catalogue and Pharmaceutical Database for compliance checking
              </p>
            </div>
            <button
              className="help-button"
              onClick={() => setShowHelp(!showHelp)}
              title="Help - Color Guide"
            >
              ?
            </button>
          </div>

          {/* Help Modal */}
          {showHelp && (
            <div className="help-modal">
              <div className="help-header">
                <h3>Color Guide</h3>
                <button onClick={() => setShowHelp(false)} className="btn-close">×</button>
              </div>
              <div className="help-content">
                <div className="help-item">
                  <span className="help-badge ingredient-danger">Example</span>
                  <div>
                    <strong>🔴 Red - Pharmaceutical Drug</strong>
                    <p>This ingredient is identified as a pharmaceutical medicine. It should not be used in food supplements.</p>
                  </div>
                </div>
                <div className="help-item">
                  <span className="help-badge ingredient-safe">Example</span>
                  <div>
                    <strong>🟢 Green - Safe</strong>
                    <p>This ingredient is found in the pharmaceutical database but is NOT classified as a medicine. It is safe to use.</p>
                  </div>
                </div>
                <div className="help-item">
                  <span className="help-badge ingredient-info">Example</span>
                  <div>
                    <strong>🔵 Blue - Novel Food</strong>
                    <p>This ingredient is registered as a Novel Food in the EU catalogue. Check the details for authorization status and conditions of use.</p>
                  </div>
                </div>
                <div className="help-item">
                  <span className="help-badge ingredient-unknown">Example</span>
                  <div>
                    <strong>⚪ Gray - No Information</strong>
                    <p>No information found in either database. This doesn't necessarily mean it's unsafe, just that it's not in our records.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ingredients Input */}
        <div className="card">
          <label className="label">
            Enter Ingredients List
          </label>
          <textarea
            placeholder="Paste ingredients list here... (e.g., NAC, Vitamin C, Spirulina, Melatonin)"
            value={ingredientsList}
            onChange={handleTextareaChange}
            className="textarea"
            rows="1"
          />
          <div className="input-footer">
            <div className="status-text">
              {loading ? (
                <span>⏳ Loading databases...</span>
              ) : loadError ? (
                <span style={{ color: '#ef4444' }}>❌ {loadError}</span>
              ) : (
                <span>
                  <strong>{novelFoods.length}</strong> novel foods and <strong>{pharmaceuticals.length}</strong> pharmaceutical ingredients loaded
                </span>
              )}
            </div>
            <button
              onClick={analyzeIngredients}
              disabled={loading || !ingredientsList.trim()}
              className="btn-analyze"
            >
              Analyze
            </button>
          </div>
        </div>

        {/* Results */}
        {analyzedIngredients.length > 0 && (
          <div className="card">
            <h2 className="results-header">
              Analysis Results ({analyzedIngredients.length} ingredients{analysisTime ? ` in ${analysisTime}s` : ''})
            </h2>

            {/* Ingredients flow like text */}
            <div className="ingredients-flow">
              {analyzedIngredients.map((ingredient, idx) => (
                <span key={idx}>
                  <span
                    className={`ingredient-badge ${
                      ingredient.status === 'danger'
                        ? 'ingredient-danger'
                        : ingredient.status === 'safe'
                        ? 'ingredient-safe'
                        : ingredient.status === 'info'
                        ? 'ingredient-info'
                        : 'ingredient-unknown'
                    }`}
                    onClick={() => setSelectedIngredient(
                      selectedIngredient === idx ? null : idx
                    )}
                  >
                    {ingredient.name}
                  </span>
                  {idx < analyzedIngredients.length - 1 && (
                    <span className="comma">,</span>
                  )}
                </span>
              ))}
            </div>

            {/* Details panel below */}
            {selectedIngredient !== null && (
              <div className="details-panel">
                <div className="details-header">
                  <div className="details-title">
                    <span className="details-icon">
                      {analyzedIngredients[selectedIngredient].status === 'danger' ? '🔴' :
                       analyzedIngredients[selectedIngredient].status === 'safe' ? '🟢' :
                       analyzedIngredients[selectedIngredient].status === 'info' ? 'ℹ️' : '❓'}
                    </span>
                    <h3>
                      {analyzedIngredients[selectedIngredient].name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedIngredient(null)}
                    className="btn-close"
                  >
                    ×
                  </button>
                </div>

                <div className={`status-badge ${
                  analyzedIngredients[selectedIngredient].status === 'danger'
                    ? 'status-badge-danger'
                    : analyzedIngredients[selectedIngredient].status === 'safe'
                    ? 'status-badge-safe'
                    : analyzedIngredients[selectedIngredient].status === 'info'
                    ? 'status-badge-info'
                    : 'status-badge-unknown'
                }`}>
                  {analyzedIngredients[selectedIngredient].statusText}
                </div>

                <div className="details-content">
                  {/* Process Flow Visualization */}
                  <div className="process-flow">
                    {analyzedIngredients[selectedIngredient].details && analyzedIngredients[selectedIngredient].details.source === 'multiple' ? (
                      <>
                        {/* Show process for each search term */}
                        {analyzedIngredients[selectedIngredient].details.matches.pharma.concat(analyzedIngredients[selectedIngredient].details.matches.novel).length > 0 ? (
                          <div>
                            {/* Group by search term */}
                            {(() => {
                              const allTerms = new Set();
                              analyzedIngredients[selectedIngredient].details.matches.pharma.forEach(m => allTerms.add(m.term));
                              analyzedIngredients[selectedIngredient].details.matches.novel.forEach(m => allTerms.add(m.term));

                              return Array.from(allTerms).map((searchTerm, termIdx) => {
                                const pharmaForTerm = analyzedIngredients[selectedIngredient].details.matches.pharma.find(m => m.term === searchTerm);
                                const novelForTerm = analyzedIngredients[selectedIngredient].details.matches.novel.find(m => m.term === searchTerm);

                                return (
                                  <div key={termIdx} className="term-process" style={{ marginBottom: termIdx < allTerms.size - 1 ? '2rem' : '0' }}>
                                    <h4 className="search-term-title">Search Term: "{searchTerm}"</h4>

                                    {/* Step 1: Substance Guide (Pharmaceutical) Check */}
                                    <div className={`process-step ${pharmaForTerm ? 'step-found' : 'step-not-found'}`}>
                                      <div className="step-header">
                                        <span className="step-number">1</span>
                                        <span className="step-title">Substance Guide Check (Pharmaceutical Database)</span>
                                        <span className="step-status">{pharmaForTerm ? '✓ Found' : '✗ Not Found'}</span>
                                      </div>
                                      {pharmaForTerm && (
                                        <div className="step-details">
                                          <p><strong>Matched as:</strong> {pharmaForTerm.result.item.name}</p>
                                          <p><strong>Classification:</strong> {pharmaForTerm.result.item.is_medicine ? '⚠️ Pharmaceutical Medicine (NOT APPROVED)' : '✓ Non-Medicine Substance (APPROVED)'}</p>
                                          {pharmaForTerm.result.item.comment && (
                                            <p><strong>Notes:</strong> {pharmaForTerm.result.item.comment}</p>
                                          )}
                                          {pharmaForTerm.result.item.synonyms && pharmaForTerm.result.item.synonyms.length > 0 && (
                                            <p><strong>Also known as:</strong> {pharmaForTerm.result.item.synonyms.slice(0, 5).join(', ')}{pharmaForTerm.result.item.synonyms.length > 5 && '...'}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Step 2: Novel Food Check - Only if passed pharma check */}
                                    <div className={`process-step ${!pharmaForTerm ? 'step-skipped' : novelForTerm ? 'step-found' : 'step-not-found'}`}>
                                      <div className="step-header">
                                        <span className="step-number">2</span>
                                        <span className="step-title">Novel Food Catalogue Check</span>
                                        <span className="step-status">
                                          {!pharmaForTerm ? '⊘ Skipped (Failed Step 1)' : novelForTerm ? '⚠️ Found (Requires Review)' : '✓ Not Found (OK)'}
                                        </span>
                                      </div>
                                      {pharmaForTerm && novelForTerm && (
                                        <div className="step-details">
                                          <p><strong>Matched as:</strong> {novelForTerm.result.item.novel_food_name}</p>
                                          {novelForTerm.result.item.common_name && (
                                            <p><strong>Common name:</strong> {novelForTerm.result.item.common_name}</p>
                                          )}
                                          <p><strong>Status:</strong> {stripHtml(novelForTerm.result.item.novel_food_status_desc)}</p>
                                          <p className="warning-note">⚠️ This is a Novel Food - Check authorization status and conditions of use</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Final Result */}
                                    <div className={`final-result ${pharmaForTerm && pharmaForTerm.result.item.is_medicine ? 'result-rejected' : pharmaForTerm ? 'result-approved' : 'result-unknown'}`}>
                                      <strong>Result:</strong> {
                                        pharmaForTerm && pharmaForTerm.result.item.is_medicine ? '❌ NOT APPROVED - Pharmaceutical Medicine' :
                                        pharmaForTerm ? '✓ APPROVED' :
                                        '❓ UNKNOWN - Not in Database'
                                      }
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div>
                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                          ❓ No information found for this ingredient in either the Substance Guide or Novel Food Catalogue.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;