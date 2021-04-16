import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { collection } from '../types/models/collection';
import { nft } from '../types/models/nft';
import { addressCollectionBalance } from '../types/models/addressCollectionBalance';

async function ensureAddressBalance(id: string): Promise<void> {
    const addressBalance = await addressCollectionBalance.get(id);
    if (!addressBalance) {
        let record = new addressCollectionBalance(id);
        record.balance = BigInt(0);
        await record.save();
    }
}

export async function handleCollectionCreated(event: SubstrateEvent): Promise<void> {
    const { event: { data: [owner, collectionId] } } = event;
    const { extrinsic: { method: { args: [url, is_fungible] } } } = event.extrinsic;

    let record = new collection(collectionId.toString());
    record.owner = owner.toString();
    record.totalSupply = BigInt(0);
    record.isFungible = Boolean(is_fungible);
    record.url = url.toString();
    await record.save();
}

export async function handlerNFTMint(extrinsic: SubstrateExtrinsic): Promise<void> {
    const mintEvent = extrinsic.events.find(e => e.event.section === 'nftModule' && e.event.method === 'NonFungibleTokenMinted');
    const { event: { data: [, start_idx, end_idx] } } = mintEvent;
    const { extrinsic: { method: { args: [receiver, collection_id, uri, amount] } } } = extrinsic;


    const nftId = `${collection_id.toString()}-${start_idx.toString()}`
    const record = new nft(nftId);

    record.collectionId = collection_id.toString();
    record.endIdx = BigInt(end_idx);
    record.owner = receiver.toString();
    record.uri = Buffer.from(uri.toString().slice(2), "hex").toString();

    const collectionRecord = await collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply + BigInt(amount);

    await ensureAddressBalance(`${collection_id.toString()}-${receiver.toString()}`)

    const addressBalanceRecord = await addressCollectionBalance.get(`${collection_id.toString()}-${receiver.toString()}`);
    addressBalanceRecord.balance = addressBalanceRecord.balance + BigInt(amount);

    await addressBalanceRecord.save();
    await collectionRecord.save();
    await record.save();
}

export async function handlerFTMint(event: SubstrateEvent): Promise<void> {
    // const { event: { data: [_collection_id] } } = event;
    const { extrinsic: { method: { args: [receiver, collection_id, amount] } } } = event.extrinsic;

    const collectionRecord = await collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply + BigInt(amount);

    await ensureAddressBalance(`${collection_id.toString()}-${receiver.toString()}`)

    const addressBalanceRecord = await addressCollectionBalance.get(`${collection_id.toString()}-${receiver.toString()}`);
    addressBalanceRecord.balance = addressBalanceRecord.balance + BigInt(amount);

    await addressBalanceRecord.save();
    await collectionRecord.save();
}

export async function handlerNFTTransferred(event: SubstrateEvent): Promise<void> {
    const { event: { data: [receiver, collection_id] } } = event;
    const { extrinsic: { method: { args: [, , start_idx, amount] } } } = event.extrinsic;

    const oldNftId = `${collection_id.toString()}-${start_idx.toString()}`;
    const nftRecord = await nft.get(oldNftId);
    const receiver_end_idx = BigInt(start_idx) + BigInt(amount) - BigInt(1);

    const senderId = `${collection_id.toString()}-${nftRecord.owner.toString()}`;
    const receiverId = `${collection_id.toString()}-${receiver.toString()}`

    await ensureAddressBalance(senderId);
    await ensureAddressBalance(receiverId);

    const senderBalanceRecord = await addressCollectionBalance.get(senderId);
    senderBalanceRecord.balance = senderBalanceRecord.balance - BigInt(amount);

    const receiverBalanceRecord = await addressCollectionBalance.get(receiverId);
    receiverBalanceRecord.balance = receiverBalanceRecord.balance + BigInt(amount);

    await senderBalanceRecord.save();
    await receiverBalanceRecord.save();

    if (receiver_end_idx !== nftRecord.endIdx) {
        const newNftStartIdx = receiver_end_idx + BigInt(1);
        const newNftId = `${collection_id.toString()}-${newNftStartIdx.toString}`
        const newNft = await nft.get(newNftId);
        if (!newNft) {
            let record = new nft(newNftId);

            record.collectionId = nftRecord.collectionId;
            record.endIdx = nftRecord.endIdx;
            record.owner = nftRecord.owner;
            record.uri = nftRecord.uri;

            await record.save();
        }
    }


    nftRecord.endIdx = receiver_end_idx;
    nftRecord.owner = receiver.toString();

    await nftRecord.save();
}

export async function handlerFTTransferred(event: SubstrateEvent): Promise<void> {
    const { event: { data: [sender,] } } = event;
    const { extrinsic: { method: { args: [receiver, collection_id, amount] } } } = event.extrinsic;

    const senderId = `${collection_id.toString()}-${sender.toString()}`
    const receiverId = `${collection_id.toString()}-${receiver.toString()}`

    await ensureAddressBalance(senderId);
    await ensureAddressBalance(receiverId);

    const senderBalanceRecord = await addressCollectionBalance.get(senderId);
    senderBalanceRecord.balance = senderBalanceRecord.balance - BigInt(amount);

    const receiverBalanceRecord = await addressCollectionBalance.get(receiverId);
    receiverBalanceRecord.balance = receiverBalanceRecord.balance + BigInt(amount);

    await senderBalanceRecord.save();
    await receiverBalanceRecord.save();
}

export async function handlerNFTBurned(event: SubstrateEvent): Promise<void> {
    const { event: { data: [burner, collection_id] } } = event;
    const { extrinsic: { method: { args: [, start_idx, amount] } } } = event.extrinsic;

    const oldNftId = `${collection_id.toString()}-${start_idx.toString()}`;
    const nftRecord = await nft.get(oldNftId);
    const burned_end_idx = BigInt(start_idx) + BigInt(amount) - BigInt(1);

    const burnerId = `${collection_id.toString()}-${burner.toString()}`;
    await ensureAddressBalance(burnerId);

    const burnerBalanceRecord = await addressCollectionBalance.get(burnerId);
    burnerBalanceRecord.balance = burnerBalanceRecord.balance - BigInt(amount);

    const collectionRecord = await collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply - BigInt(amount);

    await burnerBalanceRecord.save();
    await collectionRecord.save();

    if (burned_end_idx !== nftRecord.endIdx) {
        const newNftStartIdx = burned_end_idx + BigInt(1);
        const newNftId = `${collection_id.toString()}-${newNftStartIdx.toString()}`

        const newNft = await nft.get(newNftId);
        if (!newNft) {
            let record = new nft(newNftId);

            record.collectionId = nftRecord.collectionId;
            record.endIdx = nftRecord.endIdx;
            record.owner = nftRecord.owner;
            record.uri = nftRecord.uri;

            await record.save();
        }
    }

    await nft.remove(oldNftId);
}

export async function handlerFTBurned(event: SubstrateEvent): Promise<void> {
    const { event: { data: [burner, collection_id] } } = event;
    const { extrinsic: { method: { args: [, amount] } } } = event.extrinsic;

    const burnerId = `${collection_id.toString()}-${burner.toString()}`;
    await ensureAddressBalance(burnerId);

    const burnerBalanceRecord = await addressCollectionBalance.get(burnerId);
    burnerBalanceRecord.balance = burnerBalanceRecord.balance - BigInt(amount);

    const collectionRecord = await collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply - BigInt(amount);

    await burnerBalanceRecord.save();
    await collectionRecord.save();
}
