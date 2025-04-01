// static/script.js
document.addEventListener('DOMContentLoaded', function() {

    // --- Utility Functions ---
    function stringToColor(str) {
        if (!str || str === 'N/A' || str === 'Unknown') { 
            return '#999999'; 
        } 
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        
        // Create a wider variety of colors by adding predefined color palettes
        const colorPalettes = [
            // Bright, distinct palette
            ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
            // Pastel palette
            ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
            // Bold palette
            ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'],
            // Diverging palette
            ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd']
        ];
        
        // Choose a palette based on part of the hash
        const paletteIndex = Math.abs(hash) % colorPalettes.length;
        const palette = colorPalettes[paletteIndex];
        
        // Choose a color from the palette
        const colorIndex = Math.abs(hash) % palette.length;
        
        // Return the color from our predefined palette
        return palette[colorIndex];
    }

    function mapValue(value, in_min, in_max, out_min, out_max) {
        const in_range = in_max - in_min; const out_range = out_max - out_min; if (in_range === 0) return out_min; const clamped_value = Math.max(in_min, Math.min(in_max, value)); return Math.max(out_min, Math.min(out_max, out_min + ((clamped_value - in_min) / in_range) * out_range));
    }

    // --- DOM Elements ---
    const cyContainer = document.getElementById('cy');
    const loadingIndicator = document.getElementById('loadingIndicator'); const colorBySelect = document.getElementById('colorBy'); const filterPartySelect = document.getElementById('filterPartySelect'); const filterCoalizaoSelect = document.getElementById('filterCoalizaoSelect'); const resetFiltersButton = document.getElementById('resetFilters');

    let cy; let tippyInstances = [];
    let minCentrality = 0, maxCentrality = 1; let minWeight = 0, maxWeight = 1;

    // --- Show Loading ---
    loadingIndicator.style.display = 'block'; cyContainer.style.opacity = 0;

    // --- Load Graph Data ---
    fetch('/static/graph.json')
        .then(response => { if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); } return response.json(); })
        .then(graphData => { initializeCytoscape(graphData); })
        .catch(error => { console.error('Error loading data:', error); loadingIndicator.textContent = 'Error loading graph.'; loadingIndicator.style.color = '#f56565'; });


    // --- Initialize Cytoscape and UI ---
    function initializeCytoscape(data) {
        let elements = []; const nodesData = data.nodes || []; const linksData = data.links || []; const uniqueParties = new Set(); const uniqueCoalizoes = new Set();
        minCentrality = Infinity; maxCentrality = -Infinity; nodesData.forEach(node => { if(node.centrality !== undefined) { minCentrality = Math.min(minCentrality, node.centrality); maxCentrality = Math.max(maxCentrality, node.centrality); } }); if (minCentrality === Infinity) minCentrality = 0; if (maxCentrality === -Infinity || minCentrality === maxCentrality) maxCentrality = minCentrality + 1;
        minWeight = Infinity; maxWeight = -Infinity; linksData.forEach(link => { if(link.weight !== undefined) { minWeight = Math.min(minWeight, link.weight); maxWeight = Math.max(maxWeight, link.weight); } }); if (minWeight === Infinity) minWeight = 0; if (maxWeight === -Infinity || minWeight === maxWeight) maxWeight = minWeight + 1;
        nodesData.forEach(node => { 
            const party = node.party || 'N/A';
            let coalizao = 'Unknown';
            if (node.coalizao && node.coalizao.trim() !== '') {
                coalizao = node.coalizao.trim();
            }
            
            if (party !== 'N/A') uniqueParties.add(party); 
            if (coalizao !== 'Unknown') uniqueCoalizoes.add(coalizao); 
            
            elements.push({ 
                group: 'nodes', 
                data: { 
                    id: node.id, 
                    party: party, 
                    coalizao: coalizao, 
                    centrality: node.centrality, 
                }, 
                position: { x: node.x * 400, y: node.y * 400 }, 
                classes: 'node-base' 
            }); 
        });
        linksData.forEach(link => { elements.push({ group: 'edges', data: { id: `${link.source}-${link.target}`, source: link.source, target: link.target, weight: link.weight }, classes: 'edge-base' }); });

        // --- Populate Filter Selects ---
        populateSelectWithOptions(filterPartySelect, uniqueParties);
        populateSelectWithOptions(filterCoalizaoSelect, uniqueCoalizoes);

        // --- Get Computed CSS Variable Values (Optional, but good practice) ---
        const computedStyle = getComputedStyle(document.documentElement);
        const nodeDefaultBg = computedStyle.getPropertyValue('--node-default-bg').trim() || '#4a5568';
        const highlightBorderColor = computedStyle.getPropertyValue('--highlight-border').trim() || '#ff8c00';
        const visibleEdgeColor = computedStyle.getPropertyValue('--edge-visible').trim() || '#ff8c00';
        const neighborBgColor = computedStyle.getPropertyValue('--neighbor-bg').trim() || '#e2e8f0';
        const neighborBorderColor = computedStyle.getPropertyValue('--neighbor-border').trim() || '#a0aec0';


        // --- Create Cytoscape Instance ---
        cy = cytoscape({
            container: cyContainer, elements: elements,
            style: [ // Define styles
                { selector: 'node.node-base', style: { 'background-color': nodeDefaultBg, 'border-color': '#2d3748', 'border-width': 1, 'width': (ele) => mapValue(ele.data('centrality') || minCentrality, minCentrality, maxCentrality, 6, 28) + 'px', 'height': (ele) => mapValue(ele.data('centrality') || minCentrality, minCentrality, maxCentrality, 6, 28) + 'px', 'shape': 'ellipse', 'transition-property': 'background-color, border-color, border-width, width, height, opacity', 'transition-duration': '0.2s' } },
                { selector: 'edge.edge-base', style: { 'display': 'none', 'line-color': '#a0aec0', 'opacity': 0.6, 'width': (ele) => mapValue(ele.data('weight') || minWeight, minWeight, maxWeight, 0.6, 4) + 'px', 'curve-style': 'haystack', 'haystack-radius': 0, 'transition-property': 'line-color, width, opacity', 'transition-duration': '0.2s' } },
                { selector: 'edge.visible-edge', style: { 'display': 'element', 'opacity': 0.8, 'line-color': visibleEdgeColor, 'width': (ele) => mapValue(ele.data('weight') || minWeight, minWeight, maxWeight, 1.2, 5) + 'px', 'z-index': 50 } },
                { selector: 'node:selected, node.highlighted', style: { 'background-color': 'rgba(255, 140, 0, 0.3)', 'border-color': highlightBorderColor, 'border-width': 2.5, 'z-index': 99 } },
                { selector: 'node.neighbor-highlight', style: {
                        'background-color': neighborBgColor,
                        'border-color': neighborBorderColor,
                        'border-width': 1.5,
                        'opacity': 0.9,
                        'z-index': 90,
                        'transition-property': 'background-color, border-color, opacity', 'transition-duration': '0.2s' }
                 },
                { selector: '.filtered-out', style: { 'opacity': 0.1, 'transition-property': 'opacity', 'transition-duration': '0.3s' } }
            ],
            layout: { name: 'preset', animate: true, animationDuration: 500, fit: true, padding: 30 },
            zoom: 1, minZoom: 0.1, maxZoom: 5, wheelSensitivity: 0.2, boxSelectionEnabled: true, autounselectify: false, autoungrabify: false, hideEdgesOnViewport: false
        });

        // --- Finish Setup ---
        loadingIndicator.style.display = 'none'; cyContainer.style.opacity = 1; cyContainer.classList.add('ready');
        setupControls(); setupInteractionListeners();
        updateColors();
    } // --- End of initializeCytoscape ---


    // --- Helper to Populate Select Boxes ---
    function populateSelectWithOptions(selectElement, optionsSet) {
        selectElement.innerHTML = ''; const sortedOptions = Array.from(optionsSet).sort((a, b) => a.localeCompare(b)); sortedOptions.forEach(optionValue => { const option = document.createElement('option'); option.value = optionValue; option.textContent = optionValue; selectElement.appendChild(option); }); selectElement.selectedIndex = -1;
    }

    // --- Control Functions (updateColors, applyFilters, resetView) ---
    function debugNodeData() {
        if (!cy) return;
        console.log("=== Coalizao Values ===");
        const values = new Map();
        
        cy.nodes().forEach(node => {
            const coalizao = node.data('coalizao');
            if (!values.has(coalizao)) {
                values.set(coalizao, {
                    count: 1,
                    color: stringToColor(coalizao),
                    sample: node.id()
                });
            } else {
                const entry = values.get(coalizao);
                entry.count++;
                values.set(coalizao, entry);
            }
        });
        
        console.table(Array.from(values.entries()).map(([value, info]) => {
            return {
                'Value': value,
                'Count': info.count,
                'Color': info.color,
                'Sample Node': info.sample
            };
        }));
    }

    function updateColors() {
        if (!cy) return;
        const criterion = colorBySelect.value;
        
        if (criterion === 'coalizao') {
            debugNodeData();
        }
        
        const fixedPartyColors = {
            'pt': '#FF0000',
            'psol': '#FFCC00',
            'psd': '#0000FF',
            'psdb': '#1E90FF',
            'mdb': '#00CC00',
            'pl': '#FF6600',
            'pdt': '#8B0000',
            'pp': '#006400',
            'republicanos': '#FF00FF',
            'união': '#800080',
            'cidadania': '#FF69B4',
            'avante': '#00FFFF',
        };
        
        const fixedCoalizaoColors = {
            'governo': '#FF0000',
            'oposição': '#0000FF',
            'independente': '#FFCC00',
        };
        
        const colorMap = new Map();
        
        cy.nodes().forEach(node => {
            let value = '';
            
            if (criterion === 'party') {
                value = node.data('party');
            } else if (criterion === 'coalizao') {
                value = node.data('coalizao');
            }
            
            if (value && value !== 'N/A' && value !== 'Unknown' && value !== '') {
                const normalizedValue = value.trim().toLowerCase();
                
                if (!colorMap.has(normalizedValue)) {
                    if (criterion === 'party' && fixedPartyColors[normalizedValue]) {
                        colorMap.set(normalizedValue, fixedPartyColors[normalizedValue]);
                    } else if (criterion === 'coalizao' && fixedCoalizaoColors[normalizedValue]) {
                        colorMap.set(normalizedValue, fixedCoalizaoColors[normalizedValue]);
                    } else {
                        colorMap.set(normalizedValue, stringToColor(normalizedValue));
                    }
                }
            }
        });
        
        console.log("Color map created with", colorMap.size, "entries");
        
        cy.batch(() => {
            cy.nodes().forEach(node => {
                let color = getComputedStyle(document.documentElement).getPropertyValue('--node-default-bg').trim();
                
                let value = '';
                if (criterion === 'party') {
                    value = node.data('party');
                } else if (criterion === 'coalizao') {
                    value = node.data('coalizao');
                }
                
                if (value && value !== 'N/A' && value !== 'Unknown' && value !== '') {
                    const normalizedValue = value.trim().toLowerCase();
                    if (colorMap.has(normalizedValue)) {
                        color = colorMap.get(normalizedValue);
                    }
                }
                
                node.style('background-color', color);
            });
        });
    }

    function applyFilters() {
        if (!cy) return;
        const selectedParties = Array.from(filterPartySelect.selectedOptions).map(opt => opt.value.toLowerCase());
        const selectedCoalizoes = Array.from(filterCoalizaoSelect.selectedOptions).map(opt => opt.value.toLowerCase());
        
        let nodesToShow = cy.collection();
        let nodesToHide = cy.collection();
        
        cy.edges().removeClass('visible-edge neighbor-highlight');
        cy.elements().removeClass('highlighted').deselect();
        
        cy.nodes().forEach(node => {
            const party = node.data('party').toLowerCase();
            const coalizao = node.data('coalizao').toLowerCase();
            
            const partyMatch = selectedParties.length === 0 || selectedParties.includes(party);
            const coalizaoMatch = selectedCoalizoes.length === 0 || selectedCoalizoes.includes(coalizao);
            
            if (partyMatch && coalizaoMatch) {
                nodesToShow = nodesToShow.union(node);
            } else {
                nodesToHide = nodesToHide.union(node);
            }
        });
        
        setTimeout(() => {
            if (!cy) return;
            cy.batch(() => {
                nodesToHide.style('display', 'none');
                nodesToShow.style('display', 'element');
            });
            
            let visibleNodes = cy.nodes(':visible');
            let visibleEdges = cy.edges().filter(edge => {
                const source = edge.source();
                const target = edge.target();
                return visibleNodes.contains(source) && visibleNodes.contains(target);
            });
            
            visibleEdges.style('display', 'element');
            
            if (visibleNodes.length > 0) {
                const layout = cy.elements(':visible').layout({ 
                    name: 'cose',
                    animate: 'end', 
                    animationDuration: 1000,
                    fit: true,
                    padding: 40,
                    randomize: false,
                    componentSpacing: 40,
                    nodeRepulsion: 8000,
                    nodeOverlap: 10,
                    idealEdgeLength: 100,
                    edgeElasticity: 100,
                    nestingFactor: 1.2,
                    gravity: 80,
                    numIter: 1000,
                    initialTemp: 200,
                    coolingFactor: 0.95,
                    minTemp: 1.0
                });
                layout.run();
            }
        }, 350);
    }
    function resetView() {
        if (!cy) return;
        Array.from(filterPartySelect.options).forEach(opt => opt.selected = false);
        Array.from(filterCoalizaoSelect.options).forEach(opt => opt.selected = false);
        colorBySelect.value = 'default';
        
        cy.batch(() => {
            cy.elements()
                .removeClass('filtered-out highlighted visible-edge neighbor-highlight')
                .removeStyle('display opacity')
                .style('display', 'element')
                .deselect();
        });
        
        updateColors();
        cy.layout({ 
            name: 'preset', 
            animate: true, 
            animationDuration: 800, 
            fit: true, 
            padding: 30 
        }).run();
    }

    // --- Setup UI Control Event Listeners ---
    function setupControls() {
        colorBySelect.addEventListener('change', updateColors);
        filterPartySelect.addEventListener('change', applyFilters);
        filterCoalizaoSelect.addEventListener('change', applyFilters);
        resetFiltersButton.addEventListener('click', resetView);
    }

    // --- Setup Cytoscape Interaction Listeners ---
    function setupInteractionListeners() {
        if (!cy) return;
        cy.removeAllListeners();
        tippyInstances.forEach(instance => instance.destroy()); tippyInstances = [];
        console.log("Setting up interaction listeners...");

        cy.on('mouseover', 'node', function(event) {
            const node = event.target;
            
            const name = node.data('id') || 'Unknown';
            const party = node.data('party') || 'N/A';
            const coalizao = node.data('coalizao') || 'Unknown';
            
            const tooltipContent = `
                <div style="text-align:center; padding: 5px;">
                    <div style="font-weight:bold; margin-bottom:4px;">${name}</div>
                    <div>${party}${coalizao !== 'Unknown' ? ' - ' + coalizao : ''}</div>
                </div>
            `;
            
            const tooltip = document.createElement('div');
            tooltip.innerHTML = tooltipContent;
            tooltip.style.position = 'absolute';
            tooltip.style.zIndex = '999';
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            tooltip.className = 'cy-tooltip';
            document.body.appendChild(tooltip);
            
            const containerRect = cy.container().getBoundingClientRect();
            const nodePosition = node.renderedPosition();
            const nodeSize = Math.max(node.renderedWidth(), node.renderedHeight());
            
            tooltip.style.left = (containerRect.left + nodePosition.x) + 'px';
            tooltip.style.top = (containerRect.top + nodePosition.y - nodeSize - tooltip.offsetHeight - 10) + 'px';
            
            node.scratch('_tooltip', tooltip);
        });

        cy.on('mouseout', 'node', function(event) {
            const node = event.target;
            const tooltip = node.scratch('_tooltip');
            if (tooltip) {
                document.body.removeChild(tooltip);
                node.scratch('_tooltip', null);
            }
        });

        cy.on('pan zoom', function() {
            cy.nodes().forEach(node => {
                const tooltip = node.scratch('_tooltip');
                if (tooltip) {
                    const containerRect = cy.container().getBoundingClientRect();
                    const nodePosition = node.renderedPosition();
                    const nodeSize = Math.max(node.renderedWidth(), node.renderedHeight());
                    
                    tooltip.style.left = (containerRect.left + nodePosition.x) + 'px';
                    tooltip.style.top = (containerRect.top + nodePosition.y - nodeSize - tooltip.offsetHeight - 10) + 'px';
                }
            });
        });

        cy.on('drag', function() {
            document.querySelectorAll('.cy-tooltip').forEach(el => {
                document.body.removeChild(el);
            });
            
            cy.nodes().removeClass('neighbor-highlight');
        });

        cy.on('tap', 'node', function(event){
            const tappedNode = event.target;

            cy.nodes().removeClass('neighbor-highlight');

            if (!event.originalEvent.shiftKey) {
                cy.elements().not(tappedNode).removeClass('highlighted').deselect();
                cy.edges().removeClass('visible-edge');
            }

            if (tappedNode.selected()) {
                tappedNode.unselect().removeClass('highlighted');
            } else {
                tappedNode.select().addClass('highlighted');
            }

            let selectedNodes = cy.nodes(':selected');
            cy.edges().removeClass('visible-edge');

            if (selectedNodes.length > 0) {
                let connectedEdges = selectedNodes.connectedEdges();
                connectedEdges.addClass('visible-edge');

                let neighborNodes = connectedEdges.connectedNodes().not(selectedNodes);

                neighborNodes.addClass('neighbor-highlight');
            }
        });

        cy.on('tap', function(event){
            if( event.target === cy ){
                cy.elements().removeClass('highlighted neighbor-highlight').deselect();
                cy.edges().removeClass('visible-edge');
            }
        });
    }

});