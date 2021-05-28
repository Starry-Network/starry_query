import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { hexToString } from '../utils/utils';
import { Collection } from '../types/models/Collection';
import { Nft } from '../types/models/Nft';
import { AddressCollectionBalance } from '../types/models/AddressCollectionBalance';

import { ensureAddressBalance, NFTTransferred, NFTMint, FTMint } from '../utils/token';

export async function handleCollectionCreated(extrinsic: SubstrateExtrinsic): Promise<void> {
    const createEvent = extrinsic.events.find(e => e.event.section === 'collectionModule' && e.event.method === 'CollectionCreated');
    const { event: { data: [owner, collectionId] } } = createEvent;
    const { extrinsic: { method: { args: [uri, is_fungible] } } } = extrinsic;

    let record = new Collection(collectionId.toString());
    record.owner = owner.toString();
    record.totalSupply = BigInt(0);
    record.isFungible = Boolean(is_fungible);
    record.uri = hexToString(uri.toString());
    record.isSub = false;
    await record.save();
}

export async function handleNFTMint(event: SubstrateEvent): Promise<void> {
    // const mintEvent = extrinsic.events.find(e => e.event.section === 'nftModule' && e.event.method === 'NonFungibleTokenMinted');
    const { event: { data: [, start_idx, end_idx] } } = event;
    const { extrinsic: { method: { args: [receiver, collection_id, uri, amount] } } } = event.extrinsic;

    await NFTMint(start_idx, end_idx, receiver, collection_id, uri, amount);
}

export async function handleFTMint(event: SubstrateEvent): Promise<void> {
    // const { event: { data: [_collection_id] } } = event;
    const { extrinsic: { method: { args: [receiver, collection_id, amount] } } } = event.extrinsic;

    await FTMint(receiver, collection_id, amount)
}

export async function handleNFTTransferred(event: SubstrateEvent): Promise<void> {
    const { event: { data: [receiver, collection_id] } } = event;
    const { extrinsic: { method: { args: [, , start_idx, amount] } } } = event.extrinsic;

    await NFTTransferred(receiver, collection_id, start_idx, amount);
}

export async function handleFTTransferred(event: SubstrateEvent): Promise<void> {
    const { event: { data: [sender,] } } = event;
    const { extrinsic: { method: { args: [receiver, collection_id, amount] } } } = event.extrinsic;

    const senderId = `${collection_id.toString()}-${sender.toString()}`
    const receiverId = `${collection_id.toString()}-${receiver.toString()}`

    await ensureAddressBalance(senderId);
    await ensureAddressBalance(receiverId);

    const senderBalanceRecord = await AddressCollectionBalance.get(senderId);
    senderBalanceRecord.balance = senderBalanceRecord.balance - BigInt(amount);

    const receiverBalanceRecord = await AddressCollectionBalance.get(receiverId);
    receiverBalanceRecord.balance = receiverBalanceRecord.balance + BigInt(amount);

    await senderBalanceRecord.save();
    await receiverBalanceRecord.save();
}

export async function handleNFTBurned(event: SubstrateEvent): Promise<void> {
    const { event: { data: [burner, collection_id] } } = event;
    const { extrinsic: { method: { args: [, start_idx, amount] } } } = event.extrinsic;

    const burnerId = `${collection_id.toString()}-${burner.toString()}`;
    await ensureAddressBalance(burnerId);

    const burnerBalanceRecord = await AddressCollectionBalance.get(burnerId);
    burnerBalanceRecord.balance = burnerBalanceRecord.balance - BigInt(amount);

    await burnerBalanceRecord.save();

    const burnReceiver = "0x"
    await NFTTransferred(burnReceiver, collection_id, start_idx, amount);
}

export async function handleFTBurned(event: SubstrateEvent): Promise<void> {
    const { event: { data: [burner, collection_id] } } = event;
    const { extrinsic: { method: { args: [, amount] } } } = event.extrinsic;

    const burnerId = `${collection_id.toString()}-${burner.toString()}`;
    await ensureAddressBalance(burnerId);

    const burnerBalanceRecord = await AddressCollectionBalance.get(burnerId);
    burnerBalanceRecord.balance = burnerBalanceRecord.balance - BigInt(amount);

    const collectionRecord = await Collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply - BigInt(amount);

    await burnerBalanceRecord.save();
    await collectionRecord.save();
}
