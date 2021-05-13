import { Collection } from '../types/models/Collection';
import { Nft } from '../types/models/Nft';
import { AddressCollectionBalance } from '../types/models/AddressCollectionBalance';
import { hexToString } from '../utils/utils';

export async function ensureAddressBalance(id: string): Promise<void> {
    const addressBalance = await AddressCollectionBalance.get(id);
    if (!addressBalance) {
        let record = new AddressCollectionBalance(id);
        record.balance = BigInt(0);
        await record.save();
    }
}

export async function NFTMint(start_idx, end_idx, receiver, collection_id, uri, amount): Promise<void> {

    const nftId = `${collection_id.toString()}-${start_idx.toString()}`
    const record = new Nft(nftId);

    record.endIdx = BigInt(end_idx);
    record.owner = receiver.toString();
    record.uri = hexToString(uri.toString());
    record.isRoot = false;

    const collectionRecord = await Collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply + BigInt(amount);

    const isSubCollection = collectionRecord.isSub;
    if (isSubCollection) {
        record.isSub = true;
    } else {
        record.isSub = false;
    }
    // isSub

    await ensureAddressBalance(`${collection_id.toString()}-${receiver.toString()}`)

    const addressBalanceRecord = await AddressCollectionBalance.get(`${collection_id.toString()}-${receiver.toString()}`);
    addressBalanceRecord.balance = addressBalanceRecord.balance + BigInt(amount);

    await addressBalanceRecord.save();
    await collectionRecord.save();
    await record.save();
}

export async function FTMint(receiver, collection_id, amount): Promise<void> {
    const collectionRecord = await Collection.get(collection_id.toString());
    collectionRecord.totalSupply = collectionRecord.totalSupply + BigInt(amount);

    await ensureAddressBalance(`${collection_id.toString()}-${receiver.toString()}`)

    const addressBalanceRecord = await AddressCollectionBalance.get(`${collection_id.toString()}-${receiver.toString()}`);
    addressBalanceRecord.balance = addressBalanceRecord.balance + BigInt(amount);

    await addressBalanceRecord.save();
    await collectionRecord.save();
}

export async function NFTTransferred(receiver, collection_id, start_idx, amount): Promise<void> {
    const oldNftId = `${collection_id.toString()}-${start_idx.toString()}`;
    const nftRecord = await Nft.get(oldNftId);
    const receiver_end_idx = BigInt(start_idx) + BigInt(amount) - BigInt(1);

    const senderId = `${collection_id.toString()}-${nftRecord.owner.toString()}`;
    const receiverId = `${collection_id.toString()}-${receiver.toString()}`

    await ensureAddressBalance(senderId);
    await ensureAddressBalance(receiverId);

    const senderBalanceRecord = await AddressCollectionBalance.get(senderId);
    senderBalanceRecord.balance = senderBalanceRecord.balance - BigInt(amount);

    const receiverBalanceRecord = await AddressCollectionBalance.get(receiverId);
    receiverBalanceRecord.balance = receiverBalanceRecord.balance + BigInt(amount);

    await senderBalanceRecord.save();
    await receiverBalanceRecord.save();

    const collectionRecord = await Collection.get(collection_id.toString());

    if (receiver_end_idx !== nftRecord.endIdx) {
        const newNftStartIdx = receiver_end_idx + BigInt(1);
        const newNftId = `${collection_id.toString()}-${newNftStartIdx.toString()}`
        const newNft = await Nft.get(newNftId);
        if (!newNft) {
            let record = new Nft(newNftId);

            record.endIdx = nftRecord.endIdx;
            record.owner = nftRecord.owner;
            record.uri = nftRecord.uri;
            record.isRoot = false;

            if (collectionRecord.isSub) {
                record.isSub = true;
            } else {
                record.isSub = false;
            }

            await record.save();
        }
    }


    nftRecord.endIdx = receiver_end_idx;
    nftRecord.owner = receiver.toString();

    await nftRecord.save();
}