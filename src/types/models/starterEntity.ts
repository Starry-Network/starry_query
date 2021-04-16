// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';

export class starterEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public field1: number;

    public field2?: string;

    public field3?: bigint;

    public field4?: Date;

    public field5?: boolean;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save starterEntity entity without an ID");
        await store.set('starterEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove starterEntity entity without an ID");
        await store.remove('starterEntity', id.toString());
    }

    static async get(id:string): Promise<starterEntity>{
        assert(id !== null, "Cannot get starterEntity entity without an ID");
        const record = await store.get('starterEntity', id.toString());
        if (record){
            return starterEntity.create(record);
        }else{
            return;
        }
    }

    static create(record){
        let entity = new starterEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
