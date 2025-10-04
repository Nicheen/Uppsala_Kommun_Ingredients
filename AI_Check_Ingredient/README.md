upplement Synonym Search

This project builds a multilingual AI model that finds the canonical (official) supplement or ingredient names based on synonyms in English, Swedish, and Latin.
It uses SentenceTransformers for semantic embeddings, FAISS for fast vector search, and a blended fuzzy-semantic scoring system for better accuracy.

🚀 Features

Multilingual embeddings (English / Swedish / Latin)

Pre-computed embedding space → 🧩 no retraining required

Cached FAISS index for instant search

Canonical-only training option (uses only official names)

Clean, normalized dataset built from pharmaceutical & novel-food sources

Command-line and notebook workflows

📂 Project structure
supplement-synonym-search/
│
├── data/
│   ├── cleaned_supplements_highacc.csv        # Clean, normalized dataset
│   ├── embeddings_canonical.npy               # Precomputed canonical embeddings
│   ├── index_canonical.faiss                  # FAISS index for instant vector search
│   ├── index_lookup_canonical.csv             # Lookup table for canonical names
│   └── index_meta_canonical.json              # Metadata (model name, row count)
│
├── notebooks/
│   ├── data_processing.ipynb                  # Preprocessing pipeline
│   └── ingredient_check.ipynb                 # Demo & search interface
│
├── scripts/
│   ├── preprocess_high_accuracy.py            # High-accuracy preprocessing script
│   └── supplement_canonical_training.py       # Console search app (canonical only)
│
├── requirements.txt
├── README.md
└── .gitignore

⚡ Quick start
1️⃣ Install dependencies
pip install -r requirements.txt

2️⃣ Run the canonical search script
python scripts/supplement_canonical_training.py


✅ If the precomputed embedding space is present, you’ll see:

🔁 Loading cached embeddings/index ...
✅ FAISS index loaded from disk.


Then you can start searching immediately.

🧩 Example
🧠 Supplement Synonym Search (Canonical-Only)
✅ Loaded 3120 canonical entries
⚙️ Loading model: paraphrase-multilingual-MiniLM-L12-v2
✅ FAISS index loaded from disk.

🔍 Enter ingredient name: A-vitamin

Results for 'A-vitamin':
======================================================================
Canonical: vitamin a
  Scores → semantic: 0.91, lexical: 0.88, final: 0.90
----------------------------------------------------------------------
Canonical: vitamin a12
  Scores → semantic: 0.43, lexical: 0.37, final: 0.42
----------------------------------------------------------------------

⚙️ To rebuild embeddings (optional)

If you modify cleaned_supplements_highacc.csv or change the model:

Delete these four files:

data/embeddings_canonical.npy
data/index_canonical.faiss
data/index_lookup_canonical.csv
data/index_meta_canonical.json


Run:

python scripts/supplement_canonical_training.py


The script will rebuild and cache the new embedding space automatically.

🧮 Model details

Embedding model: paraphrase-multilingual-MiniLM-L12-v2 (fast, multilingual)
You can switch to:

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"


for higher accuracy (slower on CPU).

Scoring formula:

final_score = 0.7 * semantic_similarity + 0.3 * fuzzy_match


Adjust in ALPHA_SEM if you prefer more reliance on text similarity.

🧹 Data preprocessing

Run:

python scripts/preprocess_high_accuracy.py


This script:

Merges your raw novel-food and pharma JSON files

Normalizes text (Unicode, accents, punctuation, dashes)

Removes generic terms (“extract”, “root”, etc.)

Merges near-duplicate canonical names

Exports cleaned_supplements_highacc.csv for training

📦 Requirements
pandas
numpy
scikit-learn
sentence-transformers
faiss-cpu
rapidfuzz
tqdm

🧾 License

MIT License © 2025
Created for multilingual supplement & ingredient normalization research.

Would you like me to generate a matching requirements.txt and .gitignore file right now so you can upload everything together as a clean GitHub project?

You said:
yes
ChatGPT said:

Perfect 👏 — here are your ready-to-upload versions of requirements.txt and .gitignore.
They’re tuned for your project setup (Jupyter + SentenceTransformers + FAISS + RapidFuzz) and ensure GitHub stays clean while keeping your embedding space included.

🧩 requirements.txt
# Core scientific stack
pandas
numpy
scikit-learn
tqdm

# Embedding model & search
sentence-transformers
faiss-cpu
rapidfuzz

# Jupyter environment
ipykernel
notebook

✅ Notes:

sentence-transformers → multilingual model support

faiss-cpu → vector index (use faiss-gpu if on GPU)

rapidfuzz → lexical/fuzzy matching

ipykernel + notebook → for .ipynb files

tqdm → progress bars (used in preprocessing)

🧱 .gitignore
# ========================================
# Python cache and build
# ========================================
__pycache__/
*.pyc
*.pyo
*.pyd
*.so
build/
dist/
*.egg-info/

# ========================================
# Jupyter checkpoints
# ========================================
.ipynb_checkpoints/

# ========================================
# Virtual environments
# ========================================
venv/
.env/
env/
.venv/

# ========================================
# OS and IDE files
# ========================================
.DS_Store
Thumbs.db
.idea/
.vscode/

# ========================================
# Large cache/model files
# ========================================
# Ignore all embeddings and FAISS by default
*.npy
*.faiss
*_lookup.csv
*_meta.json

# ========================================
# But keep canonical embedding space
# (so users can run immediately)
# ========================================
!data/embeddings_canonical.npy
!data/index_canonical.faiss
!data/index_lookup_canonical.csv
!data/index_meta_canonical.json

# ========================================
# Logs / temp files
# ========================================
*.log
*.tmp
*.bak


✅ Explanation:

All cache/model artifacts ignored — except the canonical embedding space (index_canonical.*, embeddings_canonical.npy).

Prevents accidental uploads of temporary or huge files while ensuring instant functionality after clone.

💾 Recommended Repo Layout
supplement-synonym-search/
│
├── data/
│   ├── cleaned_supplements_highacc.csv
│   ├── embeddings_canonical.npy
│   ├── index_canonical.faiss
│   ├── index_lookup_canonical.csv
│   └── index_meta_canonical.json
│
├── notebooks/
│   ├── data_processing.ipynb
│   └── ingredient_check.ipynb
│
├── scripts/
│   ├── preprocess_high_accuracy.py
│   └── supplement_canonical_training.py
│
├── requirements.txt
├── README.md
└── .gitignore
