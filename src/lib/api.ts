import axios from "axios";

export interface NetworkNode {
    pubkey: string;
    tag?: string;
}

export interface NetworkLink {
    source: string;
    target: string;
    value: number;
    mint?: string;
    ticker?: string;
    type?: string;
    tag?: string;
    txId?: string;
}

export interface NetworkData {
    nodes: NetworkNode[];
    links: NetworkLink[];
}

export const api = {
    async getTransactionNetwork(signature: string): Promise<NetworkData> {
        const response = await axios.get(`/api/transaction/${signature}`);
        return response.data;
    },

    async getAccountBalances(address: string): Promise<NetworkData> {
        const response = await axios.get(`/api/account/transactions/${address}`);
        return response.data;
    },

    async getAccountInflows(address: string): Promise<NetworkData> {
        const response = await axios.get(`/api/account_inflows/${address}`);
        return response.data;
    },
};