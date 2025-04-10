'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, EdgeSingular, NodeSingular, Position } from 'cytoscape';
import popper from 'cytoscape-popper';
import { computePosition, arrow, limitShift, flip, shift } from '@floating-ui/dom';
import axios from 'axios';
import { api, NetworkData } from '@/lib/api';
import tippy from 'tippy.js';
import cytoscapePopper from 'cytoscape-popper';

function tippyFactory(ref: any, content: any) {
    const dummy = document.createElement('div');

    return tippy(dummy, {
        getReferenceClientRect: ref.getBoundingClientRect,
        trigger: 'manual',
        content: content,
        placement: 'top',
        interactive: true,
        appendTo: document.body,
        allowHTML: true,
        offset: [-75, -30],
    });
}

cytoscape.use(cytoscapePopper(tippyFactory));

declare global {
    interface Window {
        expandInDesc: (id: string) => void;
        expandOutDesc: (id: string) => void;
        expandInAsc: (id: string) => void;
        expandOutAsc: (id: string) => void;
    }
}

interface NodePaginationState {
    inAsc: { hasMore: boolean; page: number };
    inDesc: { hasMore: boolean; page: number };
    outAsc: { hasMore: boolean; page: number };
    outDesc: { hasMore: boolean; page: number };
}

const NetworkGraph: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);
    const [userInput, setUserInput] = useState("");
    const [cyInstance, setCyInstance] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [existingNodes] = useState(new Set<string>());
    const [existingEdges] = useState(new Set<string>());

    const [nodePagination, setNodePagination] = useState<Record<string, NodePaginationState>>({});
    const paginationRef = useRef<Record<string, NodePaginationState>>({});

    useEffect(() => {
        paginationRef.current = nodePagination;
    }, [nodePagination]);

    const isTransactionSignature = (input: string): boolean => {
        return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{87,88}$/.test(input);
    };

    const isAccountAddress = (input: string): boolean => {
        return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44}$/.test(input);
    };

    const initializeCytoscape = useCallback((initialData?: NetworkData) => {
        if (!cyRef.current) return;

        const cy = cytoscape({
            container: cyRef.current,
            elements: initialData ? {
                nodes: initialData.nodes.map(node => ({
                    data: {
                        id: node.pubkey,
                        label: node.label || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`,
                        img_url: node.img_url,
                        tags: node.tags,
                        type: node.type
                    }
                })),
                edges: initialData.edges.map(edge => ({
                    data: {
                        source: edge.source,
                        target: edge.target,
                        amount: edge.amount,
                        mint: edge.mint,
                        label: edge.label,
                        tokenImage: edge.tokenImage,
                        weight: Math.pow(edge.amount, 0.1),
                        type: edge.type,
                        ticker: edge.ticker,
                        value: edge.value,
                        tags: edge.tags,
                        txId: edge.txId,
                        isExpandable: edge.isExpandable
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
                        'height': 40,
                        'padding': '10px'
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
                        'line-style': (ele) => ele.data('isExpandable') ? 'dashed' : 'solid',
                    },
                },
                {
                    selector: 'edge.hover',
                    style: {
                        'label': (ele: any) => {
                            const amount = ele.data('amount');
                            const ticker = ele.data('ticker');
                            const label = ele.data('label');
                            const tokenImage = ele.data('tokenImage');
                            const formattedAmount = Number(amount).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 9
                            });
                            return label 
                                ? `${formattedAmount} ${ticker}\n${label}`
                                : `${formattedAmount} ${ticker}`;
                        },
                        'text-rotation': 'autorotate',
                        'text-margin-y': -15,
                        'text-wrap': 'wrap',
                        'text-max-width': '200px',
                        'text-events': 'yes',
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
        /*
        cy.on('dbltap', 'edge', async (evt) => {
            const edge = evt.target;
            await expandEdge(edge, cy);
        });
        */

        cy.on('tap', 'node', async (evt) => {
            const node = evt.target as NodeSingular;
            const position = evt.position;
            const nodePosition = node.position();
            const nodeWidth = node.width();
            const nodeHeight = node.height();

            // Calculate click position relative to node center
            const relX = position.x - nodePosition.x;
            const relY = position.y - nodePosition.y;
            const halfWidth = nodeWidth / 2;
            const halfHeight = nodeHeight / 2;

            // Define icon regions
            if (Math.abs(relX) > halfWidth * 0.5 || Math.abs(relY) > halfHeight * 0.5) {
                // Click was in icon region
                if (relX > 0) { // Right side
                    if (relY < 0) { // Top right
                        await expandNode(node, cy, 'out', 'desc');
                    } else { // Bottom right
                        await expandNode(node, cy, 'out', 'asc');
                    }
                } else { // Left side
                    if (relY < 0) { // Top left
                        await expandNode(node, cy, 'in', 'desc');
                    } else { // Bottom left
                        await expandNode(node, cy, 'in', 'asc');
                    }
                }
            }
        });

        cy.on('tap', 'edge', async (evt) => {
            const edge = evt.target;
            if (edge.data('isExpandable')) {
                await expandEdge(edge, cy);
                edge.data('isExpandable', false);
                edge.style('line-style', 'solid');
            }
        });

        cy.on('mouseover', 'edge', function(evt) {
            evt.target.addClass('hover');
        });

        cy.on('mouseout', 'edge', function(evt) {
            evt.target.removeClass('hover');
        });

        cy.on('mouseover', 'node', function(evt) {
            const node = evt.target as NodeSingular;
            //node.addClass('hover');
            const nodeId = node.id();
            const pagination = paginationRef.current[nodeId];
            const ref = node.popperRef();
            const tip = tippyFactory(ref, `
                <div class="p-2 bg-gray-800 rounded-md" style="min-width: 500px;">
                    <p class="text-white text-center">${nodeId}</p>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-sm" 
                            onclick="expandInDesc('${nodeId}')"
                            ${!pagination?.inDesc?.hasMore ? 'disabled style="opacity: 0.5"' : ''}>
                            ↖️ ${pagination?.inDesc?.hasMore ? 'New' : 'No More'} Inflows
                        </button>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-sm" 
                            onclick="expandOutDesc('${nodeId}')"
                            ${!pagination?.outDesc?.hasMore ? 'disabled style="opacity: 0.5"' : ''}>
                            ↗️ ${pagination?.outDesc?.hasMore ? 'New' : 'No More'} Outflows
                        </button>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-sm" 
                            onclick="expandInAsc('${nodeId}')"
                            ${!pagination?.inAsc?.hasMore ? 'disabled style="opacity: 0.5"' : ''}>
                            ↙️ ${pagination?.inAsc?.hasMore ? 'Old' : 'No More'} Inflows
                        </button>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-sm" 
                            onclick="expandOutAsc('${nodeId}')"
                            ${!pagination?.outAsc?.hasMore ? 'disabled style="opacity: 0.5"' : ''}>
                            ↘️ ${pagination?.outAsc?.hasMore ? 'Old' : 'No More'} Outflows
                        </button>
                    </div>
                </div>
            `);
            tip.show();
            node.data('tip', tip);

            window.expandInDesc = (id) => expandNode(cy.$(`#${id}`), cy, 'in', 'desc');
            window.expandOutDesc = (id) => expandNode(cy.$(`#${id}`), cy, 'out', 'desc');
            window.expandInAsc = (id) => expandNode(cy.$(`#${id}`), cy, 'in', 'asc');
            window.expandOutAsc = (id) => expandNode(cy.$(`#${id}`), cy, 'out', 'asc');
        });

        cy.on('mouseout', 'node', function(evt) {
            const node = evt.target as NodeSingular;
            node.removeClass('hover');
            const tip = node.data('tip');
            if (tip) {
                tip.destroy();
            }
        });
    };

    const expandNode = async (node: NodeSingular, cy: Core, direction: string, sort: string) => {
        try {
            setLoading(true);
            const account = node.id();
    
            const paginationKey = `${direction}${sort.charAt(0).toUpperCase() + sort.slice(1)}`;
            const currentPagination = paginationRef.current[account]?.[paginationKey as keyof NodePaginationState];
            if (currentPagination && !currentPagination.hasMore) {
                return;
            }

            const newData = await api.getAccountFlows(
                account,
                direction,
                sort,
                100,
                Array.from(existingNodes),
                Array.from(existingEdges),
                currentPagination?.page || 1
            );
            //cy.nodes().lock();

            if (newData.hasMore) {
                setNodePagination(prev => ({
                    ...prev,
                    [account]: {
                        ...prev[account],
                        [paginationKey]: {
                            hasMore: newData.hasMore,
                            page: (currentPagination?.page || 0) + 1
                        }
                    }
                }));
            } else {
                // When we reach the end of either sort direction, update both Asc and Desc for that flow direction
                setNodePagination(prev => ({
                    ...prev,
                    [account]: {
                        ...prev[account],
                        ...(direction === 'in' && {
                            inAsc: { hasMore: false, page: 1 },
                            inDesc: { hasMore: false, page: 1 }
                        }),
                        ...(direction === 'out' && {
                            outAsc: { hasMore: false, page: 1 },
                            outDesc: { hasMore: false, page: 1 }
                        })
                    }
                }));
            }
            
            const newElements = addNewElements(newData, cy);
            
            if (newElements && newElements.length > 0) {
                const newNodes = newElements.filter((ele: any) => ele.group === 'nodes');
                
                cy.layout({
                    name: 'cose',
                    animate:false,
                    spacingFactor: 5,
                }).run();

                // Animate to show all elements
                cy.animate({
                    fit: {
                        eles: cy.elements(),
                        padding: 30
                    },
                    duration: 500
                });
            }
            //cy.nodes().unlock();
        } catch (error) {
            console.error('Error expanding node:', error);
        } finally {
            setLoading(false);
        }
    };

    const expandEdge = async (edge: EdgeSingular, cy: Core) => {
        try {
            setLoading(true);
            const signature = edge.data('txId');

            // Get positions of source and target nodes
            const sourceNode = edge.source();
            const targetNode = edge.target();
            const centerX = (sourceNode.position('x') + targetNode.position('x')) / 2;
            const centerY = (sourceNode.position('y') + targetNode.position('y')) / 2;

            // Calculate edge length to use as a scale reference
            const edgeLength = Math.sqrt(
                Math.pow(targetNode.position('x') - sourceNode.position('x'), 2) +
                Math.pow(targetNode.position('y') - sourceNode.position('y'), 2)
            );

            const radius = edgeLength * 0.3;
            
            // Fetch transaction data for this edge
            const newData = await api.getTransactionFlows(
                signature,
                Array.from(existingNodes),
                Array.from(existingEdges)
            );

            cy.nodes().lock();
            
            // Lock existing nodes
            //cy.nodes().lock();
            const newElements = addNewElements(newData, cy);
            
            if (newElements && newElements.length > 0) {
                const newNodes = newElements.filter((node: any) => node.group === 'nodes');

                // Position new nodes in a circle around the center point
                newNodes.forEach((node, i) => {
                    // Use a partial circle (120 degrees) instead of full circle
                    const angleOffset = -Math.PI / 3; // Start at -60 degrees
                    const angleRange = (2 * Math.PI) / 3; // 120 degrees total
                    const angle = angleOffset + (angleRange * i) / (newNodes.length - 1 || 1);
                    
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    node.position({ x, y });
                });

                const layout = newNodes.layout({
                    name: 'circle',
                    animate:true,
                    animationDuration: 500,
                    boundingBox: {
                        x1: centerX - radius,
                        y1: centerY - radius,
                        x2: centerX + radius,
                        y2: centerY + radius
                    },
                    spacingFactor: 0.5,
                    padding: 10
                });
    
                layout.run();
            }
            cy.nodes().unlock();
        } catch (error) {
            console.error('Error expanding edge:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNewElements = (newData: NetworkData, cy: Core) => {
        if (!cy) {
            return;
        }

        let additions: cytoscape.ElementDefinition[] = [];

        // Add only new nodes
        newData.nodes.forEach(node => {
            if (!existingNodes.has(node.pubkey)) {
                existingNodes.add(node.pubkey);
                additions.push({
                    group: 'nodes' as const,
                    data: {
                        id: node.pubkey,
                        label: node.label || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`,
                        tags: node.tags
                    }
                });
    
                // Initialize pagination state for new node
                setNodePagination(prev => ({
                    ...prev,
                    [node.pubkey]: {
                        inAsc: { hasMore: true, page: 1 },
                        inDesc: { hasMore: true, page: 1 },
                        outAsc: { hasMore: true, page: 1 },
                        outDesc: { hasMore: true, page: 1 }
                    }
                }));
            }
        });

        // Add only new edges
        newData.edges.forEach(edge => {
            const edgeKey = `${edge.txId}-${edge.source}-${edge.target}-${edge.mint}-${edge.amount}`;
            if (!existingEdges.has(edgeKey)) {
                existingEdges.add(edgeKey);
                const newEdge = {
                    group: 'edges' as const,
                    data: {
                        source: edge.source,
                        target: edge.target,
                        amount: edge.amount,
                        weight: Math.pow(edge.amount, 0.1),
                        type: edge.type,
                        mint: edge.mint,
                        ticker: edge.ticker,
                        value: edge.value,
                        tags: edge.tags,
                        txId: edge.txId
                    }
                };
                additions.push(newEdge);
            }
        });

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
            const fixedInput = input.trim();
            
            if (isTransactionSignature(fixedInput)) {
                data = await api.getTransactionFlows(fixedInput, [], []);
                data.edges = data.edges.map(edge => ({ ...edge, isExpandable: false}))
            } else if (isAccountAddress(fixedInput)) {
                // Get account label from database
                const accountMetadata = await api.getAccountMetadata(fixedInput);
                data = {
                    "nodes": [{
                        "pubkey": fixedInput,
                        "label": accountMetadata.label,
                        "tags": accountMetadata.tags
                    }],
                    "edges": [],
                    "hasMore": true
                }
            } else {
                throw new Error('Invalid input format');
            }

            const initialPagination: Record<string, NodePaginationState> = {};
            data.nodes.forEach(node => {
                initialPagination[node.pubkey] = {
                    inAsc: { hasMore: true, page: 1 },
                    inDesc: { hasMore: true, page: 1 },
                    outAsc: { hasMore: true, page: 1 },
                    outDesc: { hasMore: true, page: 1 }
                };
            });

            setNodePagination(initialPagination);
            initializeCytoscape(data);
            
            // Add initial nodes to tracking set
            data.nodes.forEach(node => existingNodes.add(node.pubkey));
            data.edges.forEach(edge => existingEdges.add(`${edge.txId}-${edge.source}-${edge.target}-${edge.mint}-${edge.amount}`));
            
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setError('Failed to fetch network data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput) {
            handleInitialSearch(userInput);
        }
    };

    // Initial graph
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
        });

        // Cleanup function
        return () => {
            cy.destroy();
        };
    }, []);

    return (
        <div className="flex flex-col items-center w-full">
            <h1 className="text-3xl font-bold my-6">Solana Forensics</h1>
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