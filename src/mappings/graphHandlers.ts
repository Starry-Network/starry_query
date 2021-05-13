import { SubstrateEvent } from "@subql/types";

import { Nft } from '../types/models/Nft';
import { NFTTransferred } from '../utils/token'

export async function handleNonFungibleTokenLinked(event: SubstrateEvent): Promise<void> {
    const { extrinsic: { method: { args: [child_collection_id, child_token_id, parent_collection_id, parent_token_id] } } } = event.extrinsic;

    const palletId = "5EYCAe5aWvP3c9id3oAxbhdT4McWhyaGxGjufJ5tjHCbsKt1";
    const childNFTId = `${child_collection_id.toString()}-${child_token_id.toString()}`;
    let childNFT = await Nft.get(childNFTId);

    if (!childNFT.parentId || childNFT.owner !== palletId) {
        await NFTTransferred(palletId, child_collection_id, child_token_id, 1);
        childNFT = await Nft.get(childNFTId);
    }

    if (childNFT.parentId && childNFT.rootId === childNFT.parentId) {
        const descendants = await Nft.getByParentId(childNFT.parentId);
        const count = descendants.length;
        if (count === 1) {
            const root = await Nft.get(childNFT.parentId);
            root.isRoot = false;
            root.save();
        }
    }

    const parentId = `${parent_collection_id.toString()}-${parent_token_id.toString()}`;
    const parentNFT = await Nft.get(parentId);

    childNFT.parentId = parentId;

    if (parentNFT.rootId) {
        childNFT.rootId = parentId;
        parentNFT.isRoot = true;
    } else {
        childNFT.rootId = parentNFT.rootId;
    }

    await childNFT.save();
}

export async function handleNonFungibleTokenRecovered(event: SubstrateEvent): Promise<void> {
    const { extrinsic: { method: { args: [collection_id, token_id] } } } = event.extrinsic;

    await NFTTransferred(event.extrinsic.extrinsic.signer.toString(), collection_id, token_id, 1);

    const NFTId = `${collection_id.toString()}-${token_id.toString()}`;

    const nft = await Nft.get(NFTId);

    if (nft.parentId && nft.rootId === nft.parentId) {
        const descendants = await Nft.getByParentId(nft.parentId);
        const count = descendants.length;
        if (count === 1) {
            const root = await Nft.get(nft.parentId);
            root.isRoot = false;
            root.save();
        }
    }

    nft.parentId = null;
    nft.rootId = null;
    nft.isRoot = false;
    
    await nft.save();
}