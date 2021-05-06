// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';

export class collection implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public owner?: string;

    public url?: string;

    public isFungible?: boolean;

    public totalSupply?: bigint;

    public isSub?: boolean;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save collection entity without an ID");
        await store.set('collection', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove collection entity without an ID");
        await store.remove('collection', id.toString());
    }

    static async get(id:string): Promise<collection>{
        assert(id !== null, "Cannot get collection entity without an ID");
        const record = await store.get('collection', id.toString());
        if (record){
            return collection.create(record);
        }else{
            return;
        }
    }

    static create(record){
        let entity = new collection(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
