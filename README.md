# Grafico Camera Site

Interactive network graph of Brazilian Congress voting similarity.

The app builds a graph from voting data (`data/*.csv`) using Python, exports it to `static/graph.json`, and renders it in the browser with Cytoscape.js.

## Features

- Graph generation pipeline with `pandas`, `scikit-learn`, and `networkx`
- Node sizing by centrality
- Edge weighting by cosine similarity
- Interactive filtering by party and coalition
- Dynamic node coloring (default, party, coalition)
- Flask server for local/dev hosting

## Tech Stack

- Backend/data: Python, Flask, pandas, numpy, scikit-learn, networkx
- Frontend: HTML, CSS, vanilla JavaScript, Cytoscape.js, Tippy.js
- Data format: CSV input, JSON graph output

## Project Structure

```text
.
├── app.py                    # Flask app entrypoint
├── create_graph.py           # Builds static/graph.json from CSV data
├── requirements.txt          # Python dependencies
├── data/
│   ├── votes_pivot.csv
│   ├── partidos.csv
│   └── legislaturas.csv
├── templates/
│   └── index.html
└── static/
    ├── style.css
    ├── script.js
    └── graph.json            # Generated file
```

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Generate graph JSON:

```bash
python create_graph.py
```

4. Run the app:

```bash
python app.py
```

5. Open:

```text
http://127.0.0.1:5000
```

## Data Pipeline

1. Read voting and party data from `data/`.
2. Compute cosine similarity matrix.
3. Build network edges above threshold and keep top-k neighbors.
4. Compute layout and centrality metrics.
5. Export graph to `static/graph.json`.
6. Frontend loads JSON and renders graph interactions.

## Deployment

### PythonAnywhere (recommended for this current architecture)

- Keep Flask app as-is.
- Run `create_graph.py` whenever source data changes.
- Serve with WSGI app pointing to `app.py`.

### Static hosting (optional hybrid model)

- Pre-generate `static/graph.json`.
- Convert Flask template paths to static relative paths.
- Host on GitHub Pages (no server runtime).

## Proposed Organization Improvements

These changes will make the codebase easier to maintain:

1. Split app and data pipeline into folders:
   - `src/web/app.py`
   - `src/pipeline/create_graph.py`
2. Add a `config.py` for graph parameters (`threshold`, `top_k`, file paths).
3. Move generated artifacts to `build/graph.json` and copy to `static/` during build.
4. Add a small `Makefile`:
   - `make setup`
   - `make build-graph`
   - `make run`
5. Normalize `requirements.txt` encoding/content and pin critical versions cleanly.
6. Add `.gitignore` entries for:
   - `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`
7. Add `tests/` with at least:
   - graph generation smoke test
   - schema validation for generated JSON
8. Add `docs/`:
   - `docs/data.md` (dataset meaning and expected columns)
   - `docs/deploy-pythonanywhere.md`
9. Add CI (GitHub Actions):
   - install deps
   - run graph generation
   - run tests

## Known Notes

- `create_graph.py` currently defaults `coalizao` inside one branch; set a default before the branch to avoid edge cases.
- `requirements.txt` appears to be stored with unusual encoding; convert to UTF-8 for portability.

## License

Add your preferred license here (for example: MIT).
