import axios from "axios";

export interface NetworkNode {
    pubkey: string;
    label?: string;
    img_url?: string;
    tags?: string[];
    type?: string;
}

export interface NetworkEdge {
    source: string;
    target: string;
    amount: number;
    label?: string;
    value?: number;
    mint?: string;
    ticker?: string;
    tokenImage?: string;
    type?: string;
    txId?: string;
    programLabel?: string;
    tags?: string[];
    isExpandable?: boolean;
}

export interface NetworkData {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    hasMore: boolean;
}

export const api = {
    async getTransactionFlows(
        signature: string,
        existingNodes: string[],
        existingEdges: string[]
    ): Promise<NetworkData> {
        const response = await axios.post(`/api/transaction_flows/${signature}`, {
            existingNodes,
            existingEdges
        });
        return response.data;
    },

    async getAccountFlows(
        address: string,
        direction: string,
        sort: string,
        limit: number,
        existingNodes: string[],
        existingEdges: string[],
        page: number
    ): Promise<NetworkData> {
        const queryParams = new URLSearchParams();
        if (direction) queryParams.append('direction', direction);
        if (sort) queryParams.append('sort', sort);
        if (limit) queryParams.append('limit', limit.toString());
        if (page) queryParams.append('page', page.toString());

        const response = await axios.post(
            `/api/account_flows/${address}?${queryParams.toString()}`,
            {
                existingNodes: existingNodes,
                existingEdges: existingEdges
            }
        );
        return response.data;
    },

    async getAccountMetadata(address: string): Promise<NetworkNode> {
        const response = await axios.get(`/api/account/${address}`);
        return response.data;
    }
};