import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { Order } from '../types/models/Order';
import { Pool } from '../types/models/Pool';
import { NFTTransferred, NFTMint, FTMint } from '../utils/token';

export async function handleSellNFT(event: SubstrateEvent): Promise<void> {
    const { event: { data: [seller, order_id] } } = event;
    const { extrinsic: { method: { args: [collection_id, token_id, amount, price] } } } = event.extrinsic;

    const orderRecord = new Order(order_id.toString());
    orderRecord.nftId = `${collection_id.toString()}-${token_id.toString()}`
    orderRecord.price = BigInt(price);
    orderRecord.amount = BigInt(amount);
    orderRecord.seller = seller.toString();

    // exchange_pallet: 5EYCAe5a7x69hFY9TwczDWDhJMHXGirtzHzfYnnmc3WmBTFZ

    await NFTTransferred("5EYCAe5a7x69hFY9TwczDWDhJMHXGirtzHzfYnnmc3WmBTFZ", collection_id, token_id, amount);
    await orderRecord.save();
}

export async function handleBuyNFT(event: SubstrateEvent): Promise<void> {
    const { event: { data: [buyer, left_amount] } } = event;
    const { extrinsic: { method: { args: [order_id, amount] } } } = event.extrinsic;

    if (BigInt(left_amount) === BigInt(0)) {
        await Order.remove(order_id.toString());
    } else {
        const orderRecord = await Order.get(order_id.toString());
        const token = orderRecord.nftId.split("-");
        await NFTTransferred(buyer.toString(), token[0], token[1], amount);
        const startIdx = BigInt(token[1]) + BigInt(amount);
        const newNodeId = `${token[0]}-${startIdx.toString()}`;
        orderRecord.amount = BigInt(left_amount);
        orderRecord.nftId = newNodeId;

        await orderRecord.save();
    }
}

export async function handleCancelNFTOrder(event: SubstrateEvent): Promise<void> {
    const { event: { data: [seller, order_id] } } = event;
    const orderRecord = await Order.get(order_id.toString());
    const token = orderRecord.nftId.split("-");
    const collection_id = token[0];
    const token_id = token[1];
    const amount = orderRecord.amount;
    await NFTTransferred(seller.toString(), collection_id, token_id, amount);
    await Order.remove(order_id.toString());
}

export async function handleSemiFungiblePoolCreated(event: SubstrateEvent): Promise<void> {
    const { event: { data: [_collection_id, end_time] } } = event;
    const { extrinsic: { method: { args: [collection_id, amount, reverse_ratio, m] } } } = event.extrinsic;

    const pool = new Pool(collection_id.toString());

    pool.supply = BigInt(amount);
    pool.m = BigInt(m);
    pool.reverse_ratio = BigInt(reverse_ratio);
    pool.end_time = BigInt(end_time);
    pool.sold = BigInt(0);
    pool.pool_balance = BigInt(0);
    pool.seller = event.extrinsic.extrinsic.signer.toString();

    await pool.save();
}