import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [novelFoods, setNovelFoods] = useState([]);
  const [pharmaceuticals, setPharmaceuticals] = useState([]);
  const [ingredientsList, setIngredientsList] = useState('');
  const [analyzedIngredients, setAnalyzedIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load both datasets
  useEffect(() => {
    const loadData = async () => {
      try {
        const [novelResponse, pharmaResponse] = await Promise.all([
          fetch('/novel_foods_catalogue.json'),
          fetch('/pharmaceutical_data.json')
        ]);

        const novelData = await novelResponse.json();
        const pharmaData = await pharmaResponse.json();

        setNovelFoods(novelData);
        setPharmaceuticals(pharmaData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Analyze ingredients when user enters them
  const analyzeIngredients = () => {
    if (ingredientsList.trim() === '') {
      setAnalyzedIngredients([]);
      return;
    }

    // Split by comma, semicolon, or newline
    const ingredients = ingredientsList
      .split(/[,;\n]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0);

    const analyzed = ingredients.map(ingredient => {
      const searchLower = ingredient.toLowerCase();

      // Check if it's a novel food
      const novelMatch = novelFoods.find(food =>
        food.novel_food_name.toLowerCase() === searchLower ||
        (food.common_name && food.common_name.toLowerCase() === searchLower) ||
        (food.synonyms && food.synonyms.toLowerCase().includes(searchLower))
      );

      // Check if it's pharmaceutical
      const pharmaMatch = pharmaceuticals.find(pharma =>
        pharma.name.toLowerCase() === searchLower ||
        (pharma.synonyms && pharma.synonyms.some(syn =>
          syn.toLowerCase() === searchLower
        ))
      );

      let status = 'safe'; // green
      let statusText = 'No concerns';
      let details = null;

      if (pharmaMatch && pharmaMatch.is_medicine) {
        status = 'danger'; // red
        statusText = 'Pharmaceutical drug';
        details = { source: 'pharmaceutical', data: pharmaMatch };
      } else if (novelMatch) {
        status = 'warning'; // orange
        statusText = 'Novel Food';
        details = { source: 'novel_food', data: novelMatch };
      } else if (pharmaMatch) {
        status = 'safe'; // green
        statusText = 'Safe (not pharmaceutical)';
        details = { source: 'pharmaceutical', data: pharmaMatch };
      }

      return {
        name: ingredient,
        status,
        statusText,
        details
      };
    });

    setAnalyzedIngredients(analyzed);
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="app-container">
      <div className="max-width">
        {/* Header */}
        <div className="card header">
          <h1>Ingredient Safety Checker</h1>
          <p>
            Search the EU Novel Foods Catalogue and Pharmaceutical Database for compliance checking
          </p>
        </div>

        {/* Ingredients Input */}
        <div className="card">
          <label className="label">
            Enter Ingredients List
          </label>
          <textarea
            placeholder="Paste ingredients list here... (e.g., NAC, Vitamin C, Spirulina, Melatonin)"
            value={ingredientsList}
            onChange={(e) => setIngredientsList(e.target.value)}
            className="textarea"
          />
          <div className="input-footer">
            <div className="status-text">
              {loading ? (
                <span>⏳ Loading databases...</span>
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
              Analysis Results ({analyzedIngredients.length} ingredients)
            </h2>

            {/* Ingredients flow like text */}
            <div className="ingredients-flow">
              {analyzedIngredients.map((ingredient, idx) => (
                <span key={idx}>
                  <span
                    className={`ingredient-badge ${
                      ingredient.status === 'danger'
                        ? 'ingredient-danger'
                        : ingredient.status === 'warning'
                        ? 'ingredient-warning'
                        : 'ingredient-safe'
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
            {selectedIngredient !== null && analyzedIngredients[selectedIngredient].details && (
              <div className="details-panel">
                <div className="details-header">
                  <div className="details-title">
                    <span className="details-icon">
                      {analyzedIngredients[selectedIngredient].status === 'danger' ? '🔴' :
                       analyzedIngredients[selectedIngredient].status === 'warning' ? '🟠' : '🟢'}
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
                    : analyzedIngredients[selectedIngredient].status === 'warning'
                    ? 'status-badge-warning'
                    : 'status-badge-safe'
                }`}>
                  {analyzedIngredients[selectedIngredient].statusText}
                </div>

                <div className="details-content">
                  {analyzedIngredients[selectedIngredient].details.source === 'pharmaceutical' ? (
                    <div>
                      {analyzedIngredients[selectedIngredient].details.data.comment && (
                        <p>
                          {analyzedIngredients[selectedIngredient].details.data.comment}
                        </p>
                      )}
                      {analyzedIngredients[selectedIngredient].details.data.synonyms &&
                       analyzedIngredients[selectedIngredient].details.data.synonyms.length > 0 && (
                        <p>
                          <strong>Also known as:</strong> {analyzedIngredients[selectedIngredient].details.data.synonyms.slice(0, 5).join(', ')}
                          {analyzedIngredients[selectedIngredient].details.data.synonyms.length > 5 && '...'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p>
                        {stripHtml(analyzedIngredients[selectedIngredient].details.data.novel_food_status_desc)}
                      </p>
                      {analyzedIngredients[selectedIngredient].details.data.common_name && (
                        <p>
                          <strong>Common name:</strong> {analyzedIngredients[selectedIngredient].details.data.common_name}
                        </p>
                      )}
                    </div>
                  )}
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