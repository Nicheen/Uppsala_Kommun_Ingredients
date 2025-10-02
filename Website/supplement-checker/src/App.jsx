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

  // Common safe minerals/vitamins that may not be in the pharmaceutical database
  // but are standard approved nutritional ingredients
  const knownSafeMinerals = useRef(new Set([
    'kalcium', 'calcium',
    'magnesium',
    'järn', 'iron', 'jarn',
    'zink', 'zinc',
    'koppar', 'copper',
    'mangan', 'manganese',
    'krom', 'chromium', 'chrome',
    'molybden', 'molybdenum',
    'jod', 'iodine', 'iodid',
    'selen', 'selenium',
    'fosfor', 'phosphorus',
    'kalium', 'potassium',
    'natrium', 'sodium',
    'klor', 'chloride',
    'bor', 'boron'
  ]));

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
        const base = import.meta.env.BASE_URL;
        const [novelResponse, pharmaResponse] = await Promise.all([
          fetch(`${base}novel_foods_catalogue.json`),
          fetch(`${base}pharmaceutical_data.json`)
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

        // Smart normalization helper
        const normalizeText = (text) => {
          if (!text || typeof text !== 'string') return '';
          return text
            .toLowerCase()
            .trim()
            // Normalize diacritics (Swedish: å→a, ä→a, ö→o, etc.)
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            // Normalize common variations
            .replace(/\s+/g, ' ')  // Multiple spaces to single space
            .replace(/-/g, ' ')    // Hyphens to spaces for matching
            .replace(/'/g, '')     // Remove apostrophes
            .replace(/,/g, '');    // Remove commas
        };

        // Create hash maps for O(1) exact lookups with smart preprocessing
        const novelMap = new Map();
        novelData.forEach(food => {
          const addToMap = (key, item) => {
            if (!key || typeof key !== 'string') return;
            const normalizedKey = normalizeText(key);
            if (!normalizedKey) return;
            if (!novelMap.has(normalizedKey)) {
              novelMap.set(normalizedKey, []);
            }
            novelMap.get(normalizedKey).push(item);
          };

          // Helper to create and add multiple variants
          const addWithVariants = (text, item) => {
            if (!text || typeof text !== 'string') return;

            // Add original normalized
            addToMap(text, item);

            // Remove language tags like (DE), (EN), (SV), etc.
            const withoutLangTag = text.replace(/\s*\([A-Z]{2}\)\s*$/i, '').trim();
            if (withoutLangTag !== text) {
              addToMap(withoutLangTag, item);
            }

            // Remove any parentheses content for broader matching
            const withoutParens = text.replace(/\s*\([^)]*\)\s*/g, '').trim();
            if (withoutParens && withoutParens !== text) {
              addToMap(withoutParens, item);
            }
          };

          if (food && food.novel_food_name) {
            addWithVariants(food.novel_food_name, food);
            if (food.common_name) addWithVariants(food.common_name, food);
            if (food.synonyms) addWithVariants(food.synonyms, food);
          }
        });

        const pharmaMapInstance = new Map();
        pharmaData.forEach(pharma => {
          const addToMap = (key, item) => {
            if (!key || typeof key !== 'string') return;
            const normalizedKey = normalizeText(key);
            if (!normalizedKey) return;
            if (!pharmaMapInstance.has(normalizedKey)) {
              pharmaMapInstance.set(normalizedKey, []);
            }
            pharmaMapInstance.get(normalizedKey).push(item);
          };

          // Helper to create and add multiple variants
          const addWithVariants = (text, item) => {
            if (!text || typeof text !== 'string') return;

            // Add original normalized
            addToMap(text, item);

            // Remove language tags
            const withoutLangTag = text.replace(/\s*\([A-Z]{2}\)\s*$/i, '').trim();
            if (withoutLangTag !== text) {
              addToMap(withoutLangTag, item);
            }

            // Remove any parentheses content
            const withoutParens = text.replace(/\s*\([^)]*\)\s*/g, '').trim();
            if (withoutParens && withoutParens !== text) {
              addToMap(withoutParens, item);
            }
          };

          if (pharma && pharma.name) {
            addWithVariants(pharma.name, pharma);
            if (pharma.synonyms && Array.isArray(pharma.synonyms)) {
              pharma.synonyms.forEach(syn => addWithVariants(syn, pharma));
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
        // Normalize search term the same way as database entries
        const normalizedTerm = term
          .toLowerCase()
          .trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/-/g, ' ')
          .replace(/'/g, '')
          .replace(/,/g, '');

        const cacheKey = normalizedTerm;

        // Check cache first
        if (searchCacheRef.current.has(cacheKey)) {
          const cached = searchCacheRef.current.get(cacheKey);
          if (cached.novel) allMatches.novel.push({ term, ...cached.novel });
          if (cached.pharma) allMatches.pharma.push({ term, ...cached.pharma });
          return;
        }

        const cacheEntry = {};

        // First try exact matching using hash map (O(1) lookup)
        const exactNovelMatches = novelFoodsMap ? novelFoodsMap.get(normalizedTerm) : null;
        const exactPharmaMatches = pharmaMap ? pharmaMap.get(normalizedTerm) : null;

        // Check if it's a known safe mineral/vitamin
        const isKnownSafeMineral = knownSafeMinerals.current.has(normalizedTerm);

        // If exact match found, use it
        if (exactNovelMatches && exactNovelMatches.length > 0) {
          const match = {
            result: { item: exactNovelMatches[0], score: 0 },
            matchType: 'exact'
          };
          allMatches.novel.push({ term, ...match });
          cacheEntry.novel = match;
        }

        if (exactPharmaMatches && exactPharmaMatches.length > 0) {
          const match = {
            result: { item: exactPharmaMatches[0], score: 0 },
            matchType: 'exact'
          };
          allMatches.pharma.push({ term, ...match });
          cacheEntry.pharma = match;
        } else if (isKnownSafeMineral) {
          // If not in database but is a known safe mineral, add it as safe
          const match = {
            result: {
              item: {
                name: term,
                is_medicine: false,
                comment: 'Standard nutritional mineral/vitamin',
                synonyms: []
              },
              score: 0
            },
            matchType: 'known_safe'
          };
          allMatches.pharma.push({ term, ...match });
          cacheEntry.pharma = match;
        }

        // Store in cache with size limit to prevent memory leaks
        const MAX_CACHE_SIZE = 1000;
        if (searchCacheRef.current.size >= MAX_CACHE_SIZE) {
          // Clear oldest entries when cache gets too large
          const firstKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(firstKey);
        }
        searchCacheRef.current.set(cacheKey, cacheEntry);
      });

      // Determine overall status based on flowchart logic:
      // 1. Check Substance Guide (pharma) - if medicine → NOT APPROVED
      // 2. If Substance Guide OK → Check Novel Food - if found → NOT APPROVED
      // 3. If both OK (pharma approved + no novel food) → APPROVED
      let status = 'unknown';
      let statusText = 'No information';
      let details = null;

      const pharmaMatch = allMatches.pharma.find(m => m.result.item.is_medicine);
      const safePharmaMatch = allMatches.pharma.find(m => !m.result.item.is_medicine);

      // Step 1: Substance Guide Check
      if (pharmaMatch) {
        // Found as pharmaceutical medicine → NOT APPROVED (RED)
        status = 'danger';
        statusText = 'Non-Approved (Pharmaceutical Medicine)';
        details = {
          source: 'multiple',
          matches: allMatches,
          primaryMatch: pharmaMatch
        };
      }
      else if (safePharmaMatch) {
        // Step 2: Found in Substance Guide as safe, now check Novel Food
        if (allMatches.novel.length > 0) {
          // Found in Novel Food → NOT APPROVED (RED)
          status = 'danger';
          statusText = 'Non-Approved (Novel Food)';
          details = {
            source: 'multiple',
            matches: allMatches,
            primaryMatch: safePharmaMatch
          };
        } else {
          // Passed both checks → APPROVED (GREEN)
          status = 'safe';
          statusText = 'Approved';
          details = {
            source: 'multiple',
            matches: allMatches,
            primaryMatch: safePharmaMatch
          };
        }
      }
      else if (allMatches.novel.length > 0) {
        // Not in Substance Guide but found in Novel Food → NOT APPROVED (RED)
        status = 'danger';
        statusText = 'Non-Approved (Novel Food, not in Substance Guide)';
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
              onClick={() => setShowHelp(true)}
              title="Help - Color Guide"
            >
              ?
            </button>
          </div>
        </div>

        {/* Full Screen Help Modal */}
        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>How to Use the Ingredient Safety Checker</h2>
                <button onClick={() => setShowHelp(false)} className="modal-close">×</button>
              </div>

              <div className="modal-body">
                <section className="modal-section">
                  <h3>📋 Verification Process</h3>
                  <p>Each ingredient goes through a 2-step verification process based on Swedish food supplement regulations:</p>

                  <div className="process-explanation">
                    <div className="process-step-explanation">
                      <div className="step-number-large">1</div>
                      <div>
                        <h4>Substance Guide Check (Ämnesguiden)</h4>
                        <p>First, we check if the ingredient is in Läkemedelsverket's Substance Guide.</p>
                        <ul>
                          <li>✓ If found and NOT a medicine → Continue to Step 2</li>
                          <li>❌ If found and IS a medicine → <strong>NON-APPROVED</strong></li>
                          <li>❓ If not found → <strong>UNKNOWN</strong></li>
                        </ul>
                      </div>
                    </div>

                    <div className="process-step-explanation">
                      <div className="step-number-large">2</div>
                      <div>
                        <h4>Novel Food Catalogue Check</h4>
                        <p>If Step 1 passed, we check the EU Novel Food Catalogue.</p>
                        <ul>
                          <li>✓ If NOT found → <strong>APPROVED</strong></li>
                          <li>❌ If found → <strong>NON-APPROVED</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="modal-section">
                  <h3>🎨 Color Guide</h3>
                  <div className="color-guide-grid">
                    <div className="color-guide-item">
                      <span className="help-badge ingredient-danger">Example</span>
                      <div>
                        <h4>🔴 Red - Non-Approved</h4>
                        <p>This ingredient is <strong>NOT APPROVED</strong> for use in food supplements. It is either:</p>
                        <ul>
                          <li>A pharmaceutical medicine, OR</li>
                          <li>Found in the Novel Food Catalogue</li>
                        </ul>
                      </div>
                    </div>

                    <div className="color-guide-item">
                      <span className="help-badge ingredient-safe">Example</span>
                      <div>
                        <h4>🟢 Green - Approved</h4>
                        <p>This ingredient is <strong>APPROVED</strong>. It:</p>
                        <ul>
                          <li>Is in the Substance Guide as a non-medicine substance, AND</li>
                          <li>Is NOT in the Novel Food Catalogue</li>
                        </ul>
                      </div>
                    </div>

                    <div className="color-guide-item">
                      <span className="help-badge ingredient-unknown">Example</span>
                      <div>
                        <h4>⚪ Gray - Unknown</h4>
                        <p>This ingredient is <strong>UNKNOWN</strong>. It is not found in the Substance Guide database, so we cannot determine its approval status.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="modal-section">
                  <h3>💡 Tips</h3>
                  <ul className="tips-list">
                    <li>Click on any colored ingredient badge to see detailed verification results</li>
                    <li>The system handles parenthetical ingredient names (e.g., "Vitamin E (DL-alfa-tokoferylacetat)")</li>
                    <li>You can paste entire ingredient lists - separate with commas, semicolons, or line breaks</li>
                    <li>Analysis time is shown for transparency</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}

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
                                    <div className={`process-step ${pharmaForTerm ? (pharmaForTerm.result.item.is_medicine ? 'step-failed' : 'step-passed') : 'step-not-found'}`}>
                                      <div className="step-header">
                                        <span className="step-number">1</span>
                                        <span className="step-title">Compare with Substance Guide (Ämnesguiden)</span>
                                        <span className="step-status">
                                          {pharmaForTerm
                                            ? (pharmaForTerm.result.item.is_medicine ? '❌ Is Medicine' : '✓ Ingredients OK')
                                            : '✗ Not Found'}
                                        </span>
                                      </div>
                                      {pharmaForTerm && (
                                        <div className="step-details">
                                          <p><strong>Matched as:</strong> {pharmaForTerm.result.item.name}</p>
                                          {pharmaForTerm.matchType === 'known_safe' && (
                                            <p className="info-note">ℹ️ Recognized as a standard nutritional ingredient</p>
                                          )}
                                          <p><strong>Result:</strong> {pharmaForTerm.result.item.is_medicine ? '❌ Pharmaceutical Medicine → Non-Approved' : '✓ Non-Medicine Substance → Continue to Step 2'}</p>
                                          {pharmaForTerm.result.item.comment && (
                                            <p><strong>Notes:</strong> {pharmaForTerm.result.item.comment}</p>
                                          )}
                                          {pharmaForTerm.result.item.synonyms && pharmaForTerm.result.item.synonyms.length > 0 && (
                                            <p><strong>Also known as:</strong> {pharmaForTerm.result.item.synonyms.slice(0, 5).join(', ')}{pharmaForTerm.result.item.synonyms.length > 5 && '...'}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Step 2: Novel Food Check - Only if passed Step 1 */}
                                    <div className={`process-step ${
                                      !pharmaForTerm || pharmaForTerm.result.item.is_medicine
                                        ? 'step-skipped'
                                        : novelForTerm
                                          ? 'step-failed'
                                          : 'step-passed'
                                    }`}>
                                      <div className="step-header">
                                        <span className="step-number">2</span>
                                        <span className="step-title">Compare with EU Novel Food Catalogue</span>
                                        <span className="step-status">
                                          {!pharmaForTerm || pharmaForTerm.result.item.is_medicine
                                            ? '⊘ Skipped'
                                            : novelForTerm
                                              ? '❌ Found (Non-Approved)'
                                              : '✓ Not Found (Approved)'}
                                        </span>
                                      </div>
                                      {pharmaForTerm && !pharmaForTerm.result.item.is_medicine && novelForTerm && (
                                        <div className="step-details">
                                          <p><strong>Matched as:</strong> {novelForTerm.result.item.novel_food_name}</p>
                                          {novelForTerm.result.item.common_name && (
                                            <p><strong>Common name:</strong> {novelForTerm.result.item.common_name}</p>
                                          )}
                                          <p><strong>Status:</strong> {stripHtml(novelForTerm.result.item.novel_food_status_desc)}</p>
                                          <p className="error-note">❌ Novel Food found → Non-Approved</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Final Result */}
                                    <div className={`final-result ${
                                      pharmaForTerm && pharmaForTerm.result.item.is_medicine
                                        ? 'result-rejected'
                                        : pharmaForTerm && novelForTerm
                                          ? 'result-rejected'
                                          : pharmaForTerm && !novelForTerm
                                            ? 'result-approved'
                                            : 'result-unknown'
                                    }`}>
                                      <strong>Final Result:</strong> {
                                        pharmaForTerm && pharmaForTerm.result.item.is_medicine
                                          ? '❌ NON-APPROVED (Pharmaceutical Medicine)'
                                          : pharmaForTerm && novelForTerm
                                            ? '❌ NON-APPROVED (Novel Food)'
                                            : pharmaForTerm && !novelForTerm
                                              ? '✓ APPROVED'
                                              : '❓ UNKNOWN (Not in Substance Guide)'
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