import type { PteroApp } from '.';
import { BaseManager } from '../structures/BaseManager';
import { Dict } from '../structures/Dict';
import {
    FetchOptions,
    Filter,
    FilterArray,
    Include,
    NodeLocation,
    PaginationMeta,
    Resolvable,
    Sort,
} from '../common';
import { ValidationError } from '../structures/Errors';
import caseConv from '../util/caseConv';
import endpoints from './endpoints';

export class NodeLocationManager extends BaseManager {
    public client: PteroApp;
    public cache: Dict<number, NodeLocation>;
    public meta: PaginationMeta;

    /**
     * Allowed filter arguments for locations:
     * * short
     * * long
     */
    get FILTERS() {
        return Object.freeze(['short', 'long']);
    }

    /**
     * Allowed include arguments for locations:
     * * nodes
     * * servers
     */
    get INCLUDES() {
        return Object.freeze(['nodes', 'servers']);
    }

    /** Allowed sort arguments for locations (none). */
    get SORTS() {
        return Object.freeze([]);
    }

    constructor(client: PteroApp) {
        super();
        this.client = client;
        this.cache = new Dict();
        this.meta = {
            current: 0,
            total: 0,
            count: 0,
            perPage: 0,
            totalPages: 0,
        };
    }

    /**
     * Transforms the raw location object(s) into typed objects.
     * @param data The resolvable location object(s).
     * @returns The resolved location object(s).
     */
    _patch(data: any): any {
        if (data?.meta?.pagination) {
            this.meta = caseConv.toCamelCase(data.meta.pagination, {
                ignore: ['current_page'],
            });
            this.meta.current = data.meta.pagination.current_page;
        }

        if (data?.data) {
            const res = new Dict<number, NodeLocation>();
            for (let o of data.data) {
                const n = caseConv.toCamelCase<NodeLocation>(o.attributes);
                n.createdAt = new Date(n.createdAt);
                n.updatedAt &&= new Date(n.updatedAt);
                res.set(n.id, n);
            }

            if (this.client.options.locations.cache) this.cache.update(res);
            return res;
        }

        const loc = caseConv.toCamelCase<NodeLocation>(data.attributes);
        loc.createdAt = new Date(loc.createdAt);
        loc.updatedAt &&= new Date(loc.updatedAt);
        if (this.client.options.locations.cache) this.cache.set(data.id, loc);
        return loc;
    }

    /**
     * Resolves a location from an object. This can be:
     * * a string
     * * a number
     * * an object
     *
     * @param obj The object to resolve from.
     * @returns The resolved location or undefined if not found.
     */
    resolve(obj: Resolvable<any>): NodeLocation | undefined {
        if (typeof obj === 'number') return this.cache.get(obj);
        if (typeof obj === 'string')
            return this.cache.find(o => o.short === obj || o.long === obj);

        if (obj.relationships?.location?.attributes)
            return this._patch(obj.relationships.location) as NodeLocation;

        return undefined;
    }

    /**
     * @param id The ID of the location.
     * @returns The formatted URL to the location in the admin panel.
     */
    adminURLFor(id: number) {
        return `${this.client.domain}/admin/locations/view/${id}`;
    }

    /**
     * Fetches a location or a list of locations from the Pterodactyl API.
     * @param [id] The ID of the location.
     * @param [options] Additional fetch options.
     * @returns The fetched locations(s).
     */

    /**
     * Fetches a location from the API by its ID. This will check the cache first unless the force
     * option is specified.
     *
     * @param id The ID of the location.
     * @param [options] Additional fetch options.
     * @returns The fetched location.
     * @example
     * ```
     * app.locations.fetch(8).then(console.log).catch(console.error);
     * ```
     */
    async fetch(
        id: number,
        options?: Include<FetchOptions>,
    ): Promise<NodeLocation>;
    /**
     * Fetches a list of locations from the API with the given options (default is undefined).
     * @see {@link Include} and {@link FetchOptions}.
     *
     * @param [options] Additional fetch options.
     * @returns The fetched locations.
     * @example
     * ```
     * app.locations.fetch({ include:['nodes'] })
     *  .then(console.log)
     *  .catch(console.error);
     * ```
     */
    async fetch(
        options?: Include<FetchOptions>,
    ): Promise<Dict<number, NodeLocation>>;
    async fetch(
        op?: number | Include<FetchOptions>,
        ops: Include<FetchOptions> = {},
    ): Promise<any> {
        let path = endpoints.locations.main;
        if (typeof op === 'number') {
            if (!ops.force && this.cache.has(op)) return this.cache.get(op);

            path = endpoints.locations.get(op);
        } else {
            if (op) ops = op;
        }

        const data = await this.client.requests.get(path, ops, null, this);
        return this._patch(data);
    }

    /**
     * Fetches all locations from the API with the given options (default is undefined).
     * @see {@link Include} and {@link FetchOptions}.
     *
     * @param [options] Additional fetch options.
     * @returns The fetched locations.
     * @example
     * ```
     * app.locations.fetchAll({ include:['nodes'] })
     *  .then(console.log)
     *  .catch(console.error);
     * ```
     */

    fetchAll(
        options?: Include<Omit<FetchOptions, 'page'>>,
    ): Promise<Dict<number, NodeLocation>> {
        return this.getFetchAll(options);
    }

    /**
     * Queries the API for locations that match the specified query filters. This fetches from the
     * API directly and does not check the cache. Use cache methods for filtering and sorting.
     *
     * Available query filters:
     * * short
     * * long
     *
     * @param entity The entity to query.
     * @param options The query options to filter by.
     * @returns The queried locations.
     * @example
     * ```
     * app.locations.query('us', { filter: 'long' })
     *  .then(console.log)
     *  .catch(console.error);
     * ```
     */
    async query(
        entity: string,
        options: Filter<Sort<{}>>, // might remove sort in future
    ): Promise<Dict<number, NodeLocation>> {
        if (!options.sort && !options.filter)
            throw new ValidationError('Sort or filter is required.');

        const payload: FilterArray<Sort<{}>> = {};
        if (options.filter) payload.filter = [options.filter, entity];
        if (options.sort) payload.sort = options.sort;

        const data = await this.client.requests.get(
            endpoints.locations.main,
            payload as FilterArray<Sort<FetchOptions>>,
            null,
            this,
        );
        return this._patch(data);
    }

    /**
     * Creates a location.
     * @param short The short name for the location (usually the country code).
     * @param long The long name for the location.
     * @returns The new location.
     * @example
     * ```
     * app.locations.create('ca', 'canada')
     *  .then(console.log)
     *  .catch(console.error);
     * ```
     */
    async create(short: string, long: string): Promise<NodeLocation> {
        const data = await this.client.requests.post(endpoints.locations.main, {
            short,
            long,
        });
        return this._patch(data);
    }

    /**
     * Updates a location.
     * @param id The ID of the location.
     * @param options The updated short and/or long name of the location.
     * @returns The updated location.
     * @example
     * ```
     * app.locations.update(10, { long: 'united kingdom' })
     *  .then(console.log)
     *  .catch(console.error);
     * ```
     */
    async update(
        id: number,
        options: { short?: string; long?: string },
    ): Promise<NodeLocation> {
        if (!options.short && !options.long)
            throw new ValidationError(
                'Either short or long is required to update the location',
            );

        const data = await this.client.requests.patch(
            endpoints.locations.get(id),
            options,
        );
        return this._patch(data);
    }

    /**
     * Deletes a location.
     * @param id The ID of the location.
     * @example
     * ```
     * app.locations.delete(9).catch(console.error);
     * ```
     */
    async delete(id: number): Promise<void> {
        await this.client.requests.delete(endpoints.locations.get(id));
        this.cache.delete(id);
    }
}
