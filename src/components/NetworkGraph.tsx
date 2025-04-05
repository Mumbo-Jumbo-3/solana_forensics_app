'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, EdgeSingular, NodeSingular, Position } from 'cytoscape';
import axios from 'axios';
import { api, NetworkData } from '@/lib/api';

const NetworkGraph: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);
    const [userInput, setUserInput] = useState("");
    const [cyInstance, setCyInstance] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [existingNodes] = useState(new Set<string>());
    const [existingEdges] = useState(new Set<string>());

    const isTransactionSignature = (input: string): boolean => {
        return input.length === 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(input);
    };

    const isAccountAddress = (input: string): boolean => {
        return input.length >= 32 && input.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(input);
    };

    const proxyBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const initializeCytoscape = useCallback((initialData?: NetworkData) => {
        if (!cyRef.current) return;

        const cy = cytoscape({
            container: cyRef.current,
            elements: initialData ? {
                nodes: initialData.nodes.map(node => ({
                    data: {
                        id: node.pubkey,
                        label: node.tag || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`
                    }
                })),
                edges: initialData.links.map(link => ({
                    data: {
                        source: link.source,
                        target: link.target,
                        weight: Math.pow(link.value, 0.1),
                        type: link.type,
                        ticker: link.ticker,
                        value: link.value,
                        tag: link.tag,
                        txId: link.txId
                    }
                }))
            } : { nodes: [], edges: [] },
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(label)',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 40,
                        'height': 40
                    }
                },
                {
                    selector: 'node.hover',
                    style: {
                        'label': 'data(id)', // Show full pubkey on hover
                        'text-wrap': 'wrap',
                        'text-max-width': '200px',
                        'font-size': '12px',
                        'color': '#ffffff',
                        'text-outline-color': '#000000',
                        'text-outline-width': 3,
                        'text-background-color': 'rgba(0, 0, 0, 0.8)',
                        'text-background-opacity': 1,
                        'text-background-padding': '3px',
                        'text-background-shape': 'roundrectangle',
                        'font-weight': 'bold',
                        'z-index': 999
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 'data(weight)',
                        'line-color': (ele) => {
                            const type = ele.data('type');
                            const ticker = ele.data('ticker');
                            if (type === 'fee') return '#ff69b4'; // pink
                            return ticker === 'SOL' ? '#ffff00' : '#00ffff'; // yellow : cyan
                        },
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': (ele) => {
                            const type = ele.data('type');
                            const ticker = ele.data('ticker');
                            if (type === 'fee') return '#ff69b4';
                            return ticker === 'SOL' ? '#ffff00' : '#00ffff';
                        },
                    },
                },
                {
                    selector: 'edge.hover',
                    style: {
                        'label': (ele: any) => {
                            const value = ele.data('value');
                            const ticker = ele.data('ticker');
                            const tag = ele.data('tag');
                            const formattedValue = Number(value).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 9
                            });
                            return tag ? `${formattedValue} ${ticker}\n${tag}` : `${formattedValue} ${ticker}`;
                        },
                        'text-rotation': 'autorotate',
                        'text-margin-y': -15,
                        'text-wrap': 'wrap',
                        'text-max-width': '200px',
                        'font-size': '12px',
                        'color': '#ffffff',
                        'text-outline-color': '#000000',
                        'text-outline-width': 3,
                        'text-background-color': 'rgba(0, 0, 0, 0.8)',
                        'text-background-opacity': 1,
                        'text-background-padding': '3px',
                        'text-background-shape': 'roundrectangle',
                        'font-weight': 'bold',
                        'z-index': 999 // Ensure the label appears on top
                    }
                }
            ],
            layout: {
                name: 'circle',
                padding: 30
            }
        });

        // Add interaction handlers
        setupInteractionHandlers(cy);
        setCyInstance(cy);
        
        return cy;
    }, []);

    const setupInteractionHandlers = (cy: Core) => {
        cy.on('dbltap', 'edge', async (evt) => {
            const link = evt.target;
            await expandLink(link, cy);
        });

        cy.on('tap', 'node', function(evt) {
            const node = evt.target;
            console.log('Clicked node:', node.id());
        });

        cy.on('tap', 'edge', function(evt) {
            const edge = evt.target;
            console.log('Edge details:', {
                from: edge.source().id(),
                to: edge.target().id(),
                value: edge.data('value'),
                ticker: edge.data('ticker'),
                type: edge.data('type')
            });
        });

        cy.on('mouseover', 'edge', function(evt) {
            evt.target.addClass('hover');
        });

        cy.on('mouseout', 'edge', function(evt) {
            evt.target.removeClass('hover');
        });

        cy.on('mouseover', 'node', function(evt) {
            evt.target.addClass('hover');
        });

        cy.on('mouseout', 'node', function(evt) {
            evt.target.removeClass('hover');
        });
    };

    const expandLink = async (link: EdgeSingular, cy: Core) => {
        try {
            setLoading(true);
            const signature = link.data('txId');
            
            // Get source and target positions
            const sourceNode = link.source();
            const targetNode = link.target();
            const sourcePos = sourceNode.position();
            const targetPos = targetNode.position();
            
            // Fetch transaction data for this link
            const newData = await api.getTransactionNetwork(signature);
            
            // Lock existing nodes
            //cy.nodes().lock();
            const newElements = addNewElements(newData, cy, sourcePos, targetPos);
            
            if (newElements && newElements.length > 0) {
                // Calculate radius based on distance between nodes
                const distance = Math.sqrt(
                    Math.pow(targetPos.x - sourcePos.x, 2) + 
                    Math.pow(targetPos.y - sourcePos.y, 2)
                );
                const radius = distance * 0.25; // Adjust this factor to change circle size
                
                const layout = cy.elements().layout({
                    name: 'circle',
                    padding: 30,
                    animate: false,
                    fit: false,
                    //radius: radius,
                });
    
                layout.run().promiseOn('layoutstop');
            }
            //cy.nodes().unlock();
        } catch (error) {
            console.error('Error expanding link:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNewElements = (newData: NetworkData, cy: Core, sourcePos: Position, targetPos: Position) => {
        console.log('Starting addNewElements, cyInstance:', cy ? 'exists' : 'null');
        if (!cy) {
            console.log('No cyInstance');
            return;
        }

        let additions: cytoscape.ElementDefinition[] = [];

        // Calculate center point between source and target
        const centerX = (sourcePos.x + targetPos.x) / 2;
        const centerY = (sourcePos.y + targetPos.y) / 2;

        // Add only new nodes
        newData.nodes.forEach(node => {
            if (!existingNodes.has(node.pubkey)) {
                existingNodes.add(node.pubkey);
                const newNode = {
                    group: 'nodes' as const,
                    data: {
                        id: node.pubkey,
                        label: node.tag || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`
                    }
                };
                additions.push(newNode);
            }
        });

       // Get existing edges from cytoscape
        cy.edges().forEach(edge => {
            const edgeKey = `${edge.source().id()}-${edge.target().id()}-${edge.data('value')}-${edge.data('txId')}`;
            existingEdges.add(edgeKey);
        });

        // Add only new edges
        newData.links.forEach(link => {
            const edgeKey = `${link.source}-${link.target}-${link.value}`;
            if (!existingEdges.has(edgeKey)) {
                existingEdges.add(edgeKey);
                const newEdge = {
                    group: 'edges' as const,
                    data: {
                        source: link.source,
                        target: link.target,
                        weight: Math.pow(link.value, 0.1),
                        type: link.type,
                        ticker: link.ticker,
                        value: link.value,
                        tag: link.tag,
                        txId: link.txId
                    }
                };
                additions.push(newEdge);
            }
        });
        console.log(JSON.stringify(additions, null, 2));

        return cy.add(additions);
    };

    const handleInitialSearch = async (input: string) => {
        try {
            setLoading(true);
            setError(null);

            // Destroy existing instance if any
            cyInstance?.destroy();
                
            // Clear existing nodes set
            existingNodes.clear();
            existingEdges.clear();

            let data: NetworkData;
            
            if (isTransactionSignature(input)) {
                // Initialize new graph
                data = await api.getTransactionNetwork(input);
            } else if (isAccountAddress(input)) {
                data = await api.getAccountInflows(input);
            } else {
                throw new Error('Invalid input format');
            }
            
            initializeCytoscape(data);
            
            // Add initial nodes to tracking set
            data.nodes.forEach(node => existingNodes.add(node.pubkey));
            
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setError('Failed to fetch network data');
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkData = async (signature: string) => {
        try {
            if (isTransactionSignature(signature)) {
                let endpoint = `${proxyBaseUrl}/api/transaction/network/${signature}`;
                
                const response = await axios.get(endpoint);
                const { nodes, links } = response.data;

                // Transform the data for cytoscape
                const elements = {
                    nodes: nodes.map((node: any) => ({
                        data: {
                            id: node.pubkey,
                            label: node.tag || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`
                        }
                    })),
                    edges: links.map((link: any) => ({
                        data: {
                            source: link.source,
                            target: link.target,
                            weight: Math.pow(link.value, 0.1),
                            type: link.type,
                            ticker: link.ticker,
                            value: link.value,
                            tag: link.tag
                        }
                    }))
                };

                if (cyInstance) {
                    cyInstance.destroy();
                }

                // Create new cytoscape instance with the data
                const cy = cytoscape({
                    container: cyRef.current,
                    elements: elements,
                    style: [
                        {
                            selector: 'node',
                            style: {
                                'background-color': '#666',
                                'label': 'data(label)',
                                'color': '#fff',
                                'text-valign': 'center',
                                'text-halign': 'center',
                                'width': 40,
                                'height': 40
                            }
                        },
                        {
                            selector: 'node.hover',
                            style: {
                                'label': 'data(id)', // Show full pubkey on hover
                                'text-wrap': 'wrap',
                                'text-max-width': '200px',
                                'font-size': '12px',
                                'color': '#ffffff',
                                'text-outline-color': '#000000',
                                'text-outline-width': 3,
                                'text-background-color': 'rgba(0, 0, 0, 0.8)',
                                'text-background-opacity': 1,
                                'text-background-padding': '3px',
                                'text-background-shape': 'roundrectangle',
                                'font-weight': 'bold',
                                'z-index': 999
                            }
                        },
                        {
                            selector: 'edge',
                            style: {
                                'width': 'data(weight)',
                                'line-color': (ele) => {
                                    const type = ele.data('type');
                                    const ticker = ele.data('ticker');
                                    if (type === 'fee') return '#ff69b4'; // pink
                                    return ticker === 'SOL' ? '#ffff00' : '#00ffff'; // yellow : cyan
                                },
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle',
                                'target-arrow-color': (ele) => {
                                    const type = ele.data('type');
                                    const ticker = ele.data('ticker');
                                    if (type === 'fee') return '#ff69b4';
                                    return ticker === 'SOL' ? '#ffff00' : '#00ffff';
                                },
                            },
                        },
                        {
                            selector: 'edge.hover',
                            style: {
                                'label': (ele: any) => {
                                    const value = ele.data('value');
                                    const ticker = ele.data('ticker');
                                    const tag = ele.data('tag');
                                    const formattedValue = Number(value).toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 9
                                    });
                                    return tag ? `${formattedValue} ${ticker}\n${tag}` : `${formattedValue} ${ticker}`;
                                },
                                'text-rotation': 'autorotate',
                                'text-margin-y': -15,
                                'text-wrap': 'wrap',
                                'text-max-width': '200px',
                                'font-size': '12px',
                                'color': '#ffffff',
                                'text-outline-color': '#000000',
                                'text-outline-width': 3,
                                'text-background-color': 'rgba(0, 0, 0, 0.8)',
                                'text-background-opacity': 1,
                                'text-background-padding': '3px',
                                'text-background-shape': 'roundrectangle',
                                'font-weight': 'bold',
                                'z-index': 999 // Ensure the label appears on top
                            }
                        }
                    ],
                    layout: {
                        name: 'circle',
                        padding: 30
                    }
                });

                // Enable user interaction
                cy.on('tap', 'node', function(evt) {
                    const node = evt.target;
                    console.log('Clicked node:', node.id());
                });

                cy.on('tap', 'edge', function(evt) {
                    const edge = evt.target;
                    console.log('Edge details:', {
                        from: edge.source().id(),
                        to: edge.target().id(),
                        value: edge.data('value'),
                        ticker: edge.data('ticker'),
                        type: edge.data('type')
                    });
                });

                cy.on('mouseover', 'edge', function(evt) {
                    evt.target.addClass('hover');
                });

                cy.on('mouseout', 'edge', function(evt) {
                    evt.target.removeClass('hover');
                });

                cy.on('mouseover', 'node', function(evt) {
                    evt.target.addClass('hover');
                });

                cy.on('mouseout', 'node', function(evt) {
                    evt.target.removeClass('hover');
                });

                setCyInstance(cy);

            } else if (isAccountAddress(signature)) {
                let endpoint = `${proxyBaseUrl}/api/account/network/${signature}`;
            } else {
                throw new Error('Invalid signature format');
            }
        } catch (error) {
            console.error("Error fetching Network data:", error);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput) {
            handleInitialSearch(userInput);
        }
    };

    useEffect(() => {
        if (!cyRef.current) return;

        // Sample data - replace with your actual data
        const cy = cytoscape({
            container: cyRef.current,
            elements: {
                nodes: [
                    { data: { id: 'a', label: 'Node A' } },
                    { data: { id: 'b', label: 'Node B' } },
                    { data: { id: 'c', label: 'Node C' } }
                ],
                edges: [
                    { data: { source: 'a', target: 'b', weight: 1 } },
                    { data: { source: 'b', target: 'c', weight: 2 } },
                    { data: { source: 'c', target: 'a', weight: 3 } }
                ]
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(label)',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 40,
                        'height': 40
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 'data(weight)',
                        'line-color': '#999',
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': '#999',
                    }
                }
            ],
            layout: {
                name: 'circle',
                padding: 30
            }
        });

        // Enable user interaction
        cy.on('tap', 'node', function(evt) {
            const node = evt.target;
            console.log('Clicked node:', node.id());
        });

        // Cleanup function
        return () => {
            cy.destroy();
        };
    }, []);

    return (
        <div className="flex flex-col items-center w-full">
            <h1 className="text-3xl font-bold my-6">Solana Network Graph</h1>
            <form 
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-4 items-center mb-6"
            >
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Search a transaction or account"
                    className="w-80 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 
                             text-white placeholder-gray-400 focus:outline-none 
                             focus:border-blue-500 transition-colors"
                />
                <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             transition-colors focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:ring-opacity-50"
                >
                    Generate
                </button>
            </form>
            {loading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="loading-spinner" />
                </div>
            )}
            {error && (
                <div className="text-red-500 mb-4">
                    {error}
                </div>
            )}
            <div 
                ref={cyRef} 
                className="w-full h-[600px] bg-[#1a1a1a] border border-gray-700 rounded-lg"
            />
        </div>
    );
}

export default NetworkGraph;