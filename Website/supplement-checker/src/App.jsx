import { useState, useEffect } from 'react';

function App() {
  const [novelFoods, setNovelFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the novel foods data
  useEffect(() => {
    const loadNovelFoods = async () => {
      try {
        // Replace with your actual file path
        const response = await fetch('/novel_foods_catalogue.json');
        const data = await response.json();
        setNovelFoods(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading novel foods data:', error);
        setLoading(false);
      }
    };
    
    loadNovelFoods();
  }, []);

  // Filter and group results based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResults([]);
      return;
    }

    const results = novelFoods.filter(food => 
      food.novel_food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.common_name && food.common_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (food.synonyms && food.synonyms.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // Group by policy_item_code to consolidate duplicates
    const grouped = results.reduce((acc, food) => {
      const key = food.policy_item_code;
      if (!acc[key]) {
        acc[key] = {
          ...food,
          all_common_names: []
        };
      }
      if (food.common_name) {
        acc[key].all_common_names.push(food.common_name);
      }
      return acc;
    }, {});
    
    setFilteredResults(Object.values(grouped));
  }, [searchTerm, novelFoods]);

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            EU Novel Foods Checker
          </h1>
          <p className="text-gray-600">
            Search the EU Novel Foods Catalogue for compliance checking
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search Ingredient
          </label>
          <input
            type="text"
            placeholder="Enter ingredient name (e.g., DIM, spirulina)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
          />
          <div className="text-sm text-gray-500 mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">⏳</span> Loading database...
              </span>
            ) : (
              <span>
                <strong>{novelFoods.length}</strong> novel foods loaded in database
                {novelFoods.length === 0 && (
                  <span className="text-red-600 font-semibold"> - Check if file exists in /public folder!</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        {searchTerm && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Search Results ({filteredResults.length})
            </h2>
            
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">No novel foods found matching "{searchTerm}"</p>
                <p className="text-sm mt-2">This ingredient may not be classified as a novel food</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResults.map((food) => (
                  <div
                    key={food.policy_item_id}
                    className="border-2 border-gray-200 rounded-lg p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedItem(selectedItem?.policy_item_id === food.policy_item_id ? null : food)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-indigo-900 mb-2">
                          {food.novel_food_display_name}
                        </h3>
                        <div className="flex gap-3 flex-wrap mb-2">
                          <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                            {food.novel_food_status}
                          </span>
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                            {food.part_of_novel_food}
                          </span>
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                            {food.policy_item_code}
                          </span>
                        </div>
                        {food.common_name && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Common name:</strong> {food.common_name}
                          </p>
                        )}
                        {food.all_common_names && food.all_common_names.length > 0 && (
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>Common names ({food.all_common_names.length} languages):</strong>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {food.all_common_names.map((name, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-block bg-green-50 text-green-700 text-xs px-2 py-1 rounded"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {food.synonyms && (
                          <p className="text-sm text-gray-600">
                            <strong>Synonyms:</strong> {food.synonyms}
                          </p>
                        )}
                      </div>
                      <button className="text-indigo-600 font-bold text-xl ml-4">
                        {selectedItem?.policy_item_id === food.policy_item_id ? '−' : '+'}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {selectedItem?.policy_item_id === food.policy_item_id && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Regulatory Status</h4>
                          <p className="text-sm text-yellow-800">
                            {stripHtml(food.novel_food_status_desc)}
                          </p>
                        </div>
                        
                        {food.description && (
                          <div className="bg-gray-50 p-4 rounded">
                            <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-700">
                              {stripHtml(food.description)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;