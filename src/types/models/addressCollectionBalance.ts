// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';

export class addressCollectionBalance implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public balance?: bigint;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save addressCollectionBalance entity without an ID");
        await store.set('addressCollectionBalance', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove addressCollectionBalance entity without an ID");
        await store.remove('addressCollectionBalance', id.toString());
    }

    static async get(id:string): Promise<addressCollectionBalance>{
        assert(id !== null, "Cannot get addressCollectionBalance entity without an ID");
        const record = await store.get('addressCollectionBalance', id.toString());
        if (record){
            return addressCollectionBalance.create(record);
        }else{
            return;
        }
    }

    static create(record){
        let entity = new addressCollectionBalance(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
