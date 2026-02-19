import os
import json
import numpy as np
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph
from sklearn.metrics.pairwise import cosine_similarity

def load_data(similarity_df, similarity_matrix, partidos, threshold=0.70, top_k=11):
    """Build the network graph from similarity data and add node attributes."""
    G = nx.Graph()
    names = similarity_df.columns.tolist()

    # Add nodes
    for name in names:
        G.add_node(name)

    # Use vectorized edge selection: get upper-triangle indices and filter by threshold
    i_idx, j_idx = np.triu_indices(len(names), k=1)
    valid_mask = similarity_matrix[i_idx, j_idx] > threshold
    valid_i = i_idx[valid_mask]
    valid_j = j_idx[valid_mask]

    # Collect edges per node
    counter = {name: [] for name in names}
    for i, j in zip(valid_i, valid_j):
        counter[names[i]].append((names[j], similarity_matrix[i, j]))

    # Add only the top_k edges per node
    for source, targets in counter.items():
        if targets:
            top_edges = sorted(targets, key=lambda x: x[1], reverse=True)[:top_k]
            for target, weight in top_edges:
                G.add_edge(source, target, weight=weight)

    # Compute a spring layout for initial positions
    pos = nx.spring_layout(G, k=0.2, iterations=50, seed=58)

    # Compute centrality and betweenness metrics
    centralities = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G)

    # Assign node attributes from partidos data.
    # Assumes partidos CSV has at least a 'siglaPartido' column and optionally a 'state' column.
    for node in G.nodes():
        coalizao = 'Unknown'
        if node in partidos.index:
            party = partidos.at[node, 'siglaPartido']
            state = partidos.at[node, 'state'] if 'state' in partidos.columns else 'Unknown'
            coalizao = partidos.at[node, 'Coalizao'] if 'Coalizao' in partidos.columns else 'Unknown'
        else:
            party = 'N/A'
            state = 'Unknown'
        G.nodes[node]['party'] = party
        G.nodes[node]['state'] = state
        G.nodes[node]['coalizao'] = coalizao
        G.nodes[node]['centrality'] = centralities.get(node, 0)
        G.nodes[node]['betweenness'] = betweenness.get(node, 0)

    # Save computed layout into node attributes (for initial positions on the client)
    for node, coords in pos.items():
        G.nodes[node]['x'] = coords[0]
        G.nodes[node]['y'] = coords[1]

    return G

def main():
    # Load your CSV data (ensure votes_pivot.csv and partidos.csv are in this folder)
    votes_pivot = pd.read_csv('data/votes_pivot.csv', index_col=0)
    try:
        partidos = pd.read_csv('data/partidos.csv', index_col=0)
    except pd.errors.ParserError:
        # Fallback parser for malformed rows; skips invalid lines instead of failing build.
        partidos = pd.read_csv(
            'data/partidos.csv',
            index_col=0,
            engine='python',
            on_bad_lines='skip'
        )
    
    # Compute cosine similarity and build DataFrame
    similarity_matrix = cosine_similarity(votes_pivot)
    similarity_df = pd.DataFrame(similarity_matrix, index=votes_pivot.index, columns=votes_pivot.index)
    
    # Build the graph
    G = load_data(similarity_df, similarity_matrix, partidos)
    
    # Convert graph to node-link JSON format
    data = json_graph.node_link_data(G)
    
    # Save the JSON to the static folder
    static_dir = 'static'
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    with open(os.path.join(static_dir, 'graph.json'), 'w') as f:
        json.dump(data, f, indent=2)
    print("Graph exported to static/graph.json.")

if __name__ == '__main__':
    main()
# This script builds a network graph from similarity data and exports it to a JSON file.
