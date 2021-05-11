import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { Proposal } from '../types/models/Proposal';
import { Dao } from '../types/models/Dao';
import { Vote } from '../types/models/Vote'
import { Member } from '../types/models/Member';
import { hexToString } from '../utils/utils';


import { NFTTransferred, NFTMint, FTMint } from '../utils/token';

export async function handleDAOCreated(event: SubstrateEvent): Promise<void> {
    const { event: { data: [summoner_account, dao_account, escrow_id] } } = event;
    const { extrinsic: { method: { args: [metadata, period_duration, voting_period, grace_period, shares_requested, proposal_deposit, processing_reward, dilution_bound] } } } = event.extrinsic;
    const blockNumber = event.extrinsic.block.block.header.number;

    const daoRecord = new Dao(dao_account.toString());

    daoRecord.summoner = summoner_account.toString();
    daoRecord.escrowId = escrow_id.toString();
    daoRecord.periodDuration = Number(period_duration);
    daoRecord.votingPeriod = Number(voting_period);
    daoRecord.gracePeriod = Number(grace_period);
    daoRecord.metadata = hexToString(metadata.toString());
    daoRecord.totalShares = BigInt(shares_requested);
    daoRecord.summoningTime = blockNumber.toBigInt();
    daoRecord.dilutionBound = Number(dilution_bound);
    daoRecord.proposalDeposit = BigInt(proposal_deposit);
    daoRecord.processingReward = BigInt(processing_reward);

    await daoRecord.save()

    if (daoRecord.totalShares !== BigInt(0)) {
        const memberId = `${dao_account.toString()}-${event.extrinsic.extrinsic.signer.toString()}`;
        const memberRecord = new Member(memberId);
        memberRecord.shares = daoRecord.totalShares;
        memberRecord.daoId = dao_account.toString();
        await memberRecord.save();
    }
}

export async function handleProposalSubmitted(event: SubstrateEvent): Promise<void> {
    const { event: { data: [proposal_id] } } = event;
    const { extrinsic: { method: { args: [dao_account, applicant, shares_requested, tribute_offered, tribute_nft, details, action] } } } = event.extrinsic;

    let daoRecord = await Dao.get(dao_account.toString());

    let tributeNftId = null;
    const tribute_nft_string = tribute_nft.toString();
    if (tribute_nft_string !== "") {
        let nft = JSON.parse(tribute_nft_string);
        tributeNftId = `${nft[0]}-${nft[1]}`;
        await NFTTransferred(daoRecord.escrowId, nft[0], nft[1], 1);
    }

    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;
    const proposalRecord = new Proposal(proposalId);

    proposalRecord.daoId = dao_account.toString();
    proposalRecord.applicant = applicant.toString();
    proposalRecord.proposer = event.extrinsic.extrinsic.signer.toString();
    proposalRecord.sharesRequested = BigInt(shares_requested);
    proposalRecord.tributeOffered = BigInt(tribute_offered);
    proposalRecord.tributeNftId = tributeNftId;
    proposalRecord.startingPeriod = BigInt(0);
    proposalRecord.details = details.toString();
    proposalRecord.action = action.toString();
    proposalRecord.sponsored = false;
    proposalRecord.processed = false;
    proposalRecord.didPass = false;
    proposalRecord.cancelled = false;
    proposalRecord.executed = false;

    proposalRecord.yesVotes = BigInt(0);
    proposalRecord.noVotes = BigInt(0);

    await proposalRecord.save();
}

export async function handleProposalCanceled(event: SubstrateEvent): Promise<void> {
    const { extrinsic: { method: { args: [dao_account, proposal_id] } } } = event.extrinsic;
    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;

    const proposalRecord = await Proposal.get(proposalId);
    proposalRecord.cancelled = true;

    if (proposalRecord.tributeNftId) {
        const nft = proposalRecord.tributeNftId.split("-");
        await NFTTransferred(proposalRecord.proposer, nft[0], nft[1], 1);
    }

    await proposalRecord.save();
}

export async function handleProposalSponsored(event: SubstrateEvent): Promise<void> {
    const { event: { data: [queue_index, starting_period] } } = event;
    const { extrinsic: { method: { args: [dao_account, proposal_id] } } } = event.extrinsic;

    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;
    const proposalRecord = await Proposal.get(proposalId);

    proposalRecord.sponsor = event.extrinsic.extrinsic.signer.toString();
    proposalRecord.sponsored = true;
    proposalRecord.index = BigInt(queue_index);
    proposalRecord.startingPeriod = BigInt(starting_period);

    await proposalRecord.save();
}


export async function handleProposalVoted(event: SubstrateEvent): Promise<void> {
    const { event: { data: [proposal_id, member_shares, yes] } } = event;
    const { extrinsic: { method: { args: [dao_account, proposal_index] } } } = event.extrinsic;

    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;
    const proposalRecord = await Proposal.get(proposalId);

    if (Boolean(yes)) {
        proposalRecord.yesVotes = proposalRecord.yesVotes + BigInt(member_shares);
    } else {
        proposalRecord.noVotes = proposalRecord.noVotes + BigInt(member_shares);
    }

    const voteId = `${dao_account.toString()}-${proposal_id.toString()}-${event.extrinsic.extrinsic.signer.toString()}`;
    const voteRecord = new Vote(voteId);
    voteRecord.proposalId = proposalId;
    voteRecord.date = event.block.timestamp;
    voteRecord.shares = BigInt(member_shares);
    voteRecord.yes = Boolean(yes);

    await proposalRecord.save();
    await voteRecord.save();
}

export async function handleProposalExecuted(event: SubstrateEvent): Promise<void> {
    const { event: { data: [proposal_id, executed] } } = event;
    const { extrinsic: { method: { args: [dao_account, proposal_index] } } } = event.extrinsic;

    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;
    const proposalRecord = await Proposal.get(proposalId);

    proposalRecord.executed = Boolean(executed);

    await proposalRecord.save();
}

export async function handleProposalProcessed(event: SubstrateEvent): Promise<void> {
    const { event: { data: [proposal_id, did_pass] } } = event;
    const { extrinsic: { method: { args: [dao_account, proposal_index] } } } = event.extrinsic;

    const proposalId = `${dao_account.toString()}-${proposal_id.toString()}`;
    const proposalRecord = await Proposal.get(proposalId);

    proposalRecord.processed = Boolean(did_pass);

    if (!proposalRecord.processed && proposalRecord.tributeNftId) {
        const nft = proposalRecord.tributeNftId.split("-");
        await NFTTransferred(proposalRecord.proposer, nft[0], nft[1], 1);
    } else if (proposalRecord.sharesRequested > BigInt(0)) {
        const memberId = `${dao_account.toString()}-${proposalRecord.applicant}`;
        let memberRecord = await Member.get(memberId);
        if (!memberRecord) {
            memberRecord = new Member(memberId);
            memberRecord.shares = proposalRecord.sharesRequested;
            memberRecord.daoId = dao_account.toString();
            await memberRecord.save();
        } else {
            memberRecord.shares = memberRecord.shares + proposalRecord.sharesRequested;
            await memberRecord.save();
        }
    }

    await proposalRecord.save();
}

export async function handleMemberRagequited(event: SubstrateEvent): Promise<void> {
    const { extrinsic: { method: { args: [dao_account, shares_to_burn] } } } = event.extrinsic;

    const memberId = `${dao_account.toString()}-${event.extrinsic.extrinsic.signer.toString()}`;

    const memberRecord = await Member.get(memberId);
    memberRecord.shares = memberRecord.shares - BigInt(shares_to_burn);
    await memberRecord.save();

    if (memberRecord.shares === BigInt(0)) {
        await Member.remove(memberId);
    }
}

