// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';

export class nft implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public collectionId?: string;

    public endIdx?: bigint;

    public owner?: string;

    public uri?: string;

    public locked?: boolean;

    public isSub?: boolean;

    public splitedFrom?: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save nft entity without an ID");
        await store.set('nft', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove nft entity without an ID");
        await store.remove('nft', id.toString());
    }

    static async get(id:string): Promise<nft>{
        assert(id !== null, "Cannot get nft entity without an ID");
        const record = await store.get('nft', id.toString());
        if (record){
            return nft.create(record);
        }else{
            return;
        }
    }

    static create(record){
        let entity = new nft(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
