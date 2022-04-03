import type PteroApp from '../application/app';
import { Limits, FeatureLimits } from '../common';

export default class ApplicationServer {
    public client: PteroApp;

    /** The internal ID of the server (separate from UUID). */
    public readonly id: number;

    /** The UUID of the server. */
    public readonly uuid: string;

    /** A substring of the server's UUID. */
    public readonly identifier: string;

    /** The date the server was created. */
    public readonly createdAt: Date;
    public readonly createdTimestamp: number;

    /** The external ID of the server (if set). */
    public externalId: string | null;

    /** The name of the server. */
    public name: string;

    /** The description of the server (if set). */
    public description: string | null;

    /** Whether the server is suspended from action. */
    public suspended: boolean;

    /** An object containing the server's limits. */
    public limits: Limits;

    /** An object containing the server's feature limits. */
    public featureLimits: FeatureLimits;

    /** The ID of the server owner. */
    public ownerId: number;

    /**
     * The owner of the server. This is not fetched by default and must be
     * retrieved by including 'user' in ApplicationServerManager#fetch.
     * @todo
     */
    public owner: null;

    /** The ID of the node the server is on. */
    public nodeId: number;

    /**
     * The node the server is on. This is not fetched by default and must be
     * retrieved by including 'node' in ApplicationServerManager#fetch.
     * @todo
     */
    public node: null;

    /** The ID of the allocation for the server. */
    public allocation: number;

    /** The ID of the nest the server is part of. */
    public nest: number;

    /** The ID of the egg the server uses. */
    public egg: number;

    constructor(client: PteroApp, data: any) {
        this.client = client;
        this.id = data.id;
        this.uuid = data.uuid;
        this.identifier = data.identifier;
        this.createdAt = new Date(data.created_at);
        this.createdTimestamp = this.createdAt.getTime();

        this._patch(data);
    }

    _patch(data: any) {}
}