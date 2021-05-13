// handleSubCreate
import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { Collection } from '../types/models/Collection';
import { Nft } from '../types/models/Nft';
import { NFTTransferred, NFTMint, FTMint } from '../utils/token'

export async function handleSubCreate(event: SubstrateEvent): Promise<void> {
    const { event: { data: [sub_token_collection_id] } } = event;
    const { extrinsic: { method: { args: [collection_id, start_idx, is_fungible] } } } = event.extrinsic;

    // can use https://www.shawntabrizi.com/substrate-js-utilities/
    // "SubToken"
    await NFTTransferred("5EYCAe5cvWwuASaBGzVg1qYZsaxUYejHQf9rqLHKCEeTfbA8", collection_id, start_idx, 1);

    const nftId = `${collection_id.toString()}-${start_idx.toString()}`;
    const nftRecord = await Nft.get(nftId);
    nftRecord.locked = true;

    let collectionRecord = await Collection.get(collection_id.toString());
    const record = await new Collection(sub_token_collection_id.toString());
    record.owner = event.extrinsic.extrinsic.signer.toString();
    record.totalSupply = BigInt(0);
    record.isFungible = Boolean(is_fungible);
    record.uri = collectionRecord.uri;
    record.isSub = true;
    record.splitedFromId = nftId;
    await nftRecord.save();
    await record.save();
}


export async function handleSubNFTMint(event: SubstrateEvent): Promise<void> {
    const { event: { data: [, start_idx, end_idx] } } = event;
    const { extrinsic: { method: { args: [receiver, sub_collection_id, uri, amount] } } } = event.extrinsic;

    await NFTMint(start_idx, end_idx, receiver, sub_collection_id, uri, amount);
}

export async function handleSubFTMint(event: SubstrateEvent): Promise<void> {
    const { extrinsic: { method: { args: [receiver, collection_id, amount] } } } = event.extrinsic;

    await FTMint(receiver, collection_id, amount)
}

export async function handleSubRecover(event: SubstrateEvent): Promise<void> {
    const { event: { data: [collection_id, start_idx] } } = event;
    const { extrinsic: { method: { args: [sub_token_collection_id] } } } = event.extrinsic;

    await Collection.remove(sub_token_collection_id.toString());
    await NFTTransferred(event.extrinsic.extrinsic.signer.toString(), collection_id, start_idx, 1);
}