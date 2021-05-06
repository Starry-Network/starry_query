import { collection } from '../types/models/collection';
import { nft } from '../types/models/nft';
import { addressCollectionBalance } from '../types/models/addressCollectionBalance';

export async function ensureAddressBalance(id: string): Promise<void> {
    const addressBalance = await addressCollectionBalance.get(id);
    if (!addressBalance) {
        let record = new addressCollectionBalance(id);
        record.balance = BigInt(0);
        await record.save();
    }
}

export async function NFTTransferred(receiver, collection_id, start_idx, amount) {
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