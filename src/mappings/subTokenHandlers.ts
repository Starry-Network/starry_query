// handlerSubCreate
import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { collection } from '../types/models/collection';
import { nft } from '../types/models/nft';
import {NFTTransferred} from '../utils/token'

export async function handlerSubCreate(event: SubstrateEvent): Promise<void> {
    const { event: { data: [sub_token_collection_id] } } = event;
    const { extrinsic: { method: { args: [collection_id, start_idx, is_fungible] } } } = event.extrinsic;

    // can use https://www.shawntabrizi.com/substrate-js-utilities/
    // "SubToken"
    await NFTTransferred("5EYCAe5cvWwuASaBGzVg1qYZsaxUYejHQf9rqLHKCEeTfbA8", collection_id, start_idx, 1);

    const nftId = `${collection_id.toString()}-${start_idx.toString()}`;
    const nftRecord = await nft.get(nftId);
    nftRecord.locked = true;

    let collectionRecord = await collection.get(collection_id.toString());
    const record = await new collection(sub_token_collection_id.toString());
    record.owner = collectionRecord.owner;
    record.totalSupply = BigInt(0);
    record.isFungible = Boolean(is_fungible);
    record.url = collectionRecord.url;
    record.isSub = true;

    await nftRecord.save();
    await record.save();
}


